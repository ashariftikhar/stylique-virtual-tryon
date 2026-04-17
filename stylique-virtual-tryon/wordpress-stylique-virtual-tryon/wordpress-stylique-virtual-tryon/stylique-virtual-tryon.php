<?php
/**
 * Plugin Name: Stylique Virtual Try-On
 * Plugin URI: https://styliquetechnologies.com
 * Description: Adds AI-powered Virtual Try-On and Size Recommendations to your WooCommerce product pages.
 * Version: 1.9.6
 * Author: Stylique Technologies
 * Author URI: https://styliquetechnologies.com
 * License: GPL-2.0+
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Check if WooCommerce is active
if ( ! in_array( 'woocommerce/woocommerce.php', apply_filters( 'active_plugins', get_option( 'active_plugins' ) ) ) ) {
	return;
}

class Stylique_Virtual_TryOn {

	/** @var array Products synced during this request (deduplication) */
	private static $synced_this_request = array();

	/** @var array Sync results for admin notices */
	private static $sync_results = array();

	/** @var array Product IDs to sync on shutdown (admin) — after gallery meta is saved */
	private static $pending_admin_sync_ids = array();

	/** @var bool */
	private static $shutdown_sync_registered = false;

	public function __construct() {
		// Admin Settings
		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );

		// Frontend Assets
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );

		// Frontend Content Injection
		add_action( 'woocommerce_after_add_to_cart_form', array( $this, 'render_tryon_section' ), 30 );

		// ── Product Sync Hooks (multiple layers for reliability) ──

		// Layer 1: WooCommerce-specific hooks (most reliable when WC fires them)
		add_action( 'woocommerce_new_product', array( $this, 'sync_product_to_backend' ), 10, 1 );
		add_action( 'woocommerce_update_product', array( $this, 'sync_product_to_backend' ), 10, 1 );
		add_action( 'woocommerce_product_object_updated_props', array( $this, 'sync_product_to_backend' ), 10, 2 );

		// Layer 2: save_post_product — priority 20 runs after core/WC meta saves (default ~10). Admin sync still defers to shutdown:99 for gallery.
		add_action( 'save_post_product', array( $this, 'sync_on_post_save' ), 20, 3 );

		// Layer 3: wp_insert_post — fires for ALL post types; we filter to 'product'
		add_action( 'wp_insert_post', array( $this, 'sync_on_insert_post' ), 30, 3 );

		// Layer 4: Shutdown safety net — if nothing else synced a product saved this request
		add_action( 'shutdown', array( $this, 'shutdown_sync_check' ) );

		// Admin notices (show sync result after redirect)
		add_action( 'admin_notices', array( $this, 'show_sync_notices' ) );
	}

	/* ------------------------------------------------------------------ */
	/*  Admin Settings                                                     */
	/* ------------------------------------------------------------------ */

	public function add_admin_menu() {
		add_options_page(
			'Stylique Settings',
			'Stylique Try-On',
			'manage_options',
			'stylique-virtual-tryon',
			array( $this, 'settings_page_html' )
		);
	}

	public function register_settings() {
		register_setting( 'stylique_options', 'stylique_store_id' );
		register_setting( 'stylique_options', 'stylique_backend_url' );
		register_setting( 'stylique_options', 'stylique_sync_secret' );
		register_setting( 'stylique_options', 'stylique_primary_color' );
		register_setting( 'stylique_options', 'stylique_secondary_color' );
	}

	public function settings_page_html() {
		?>
		<div class="wrap">
			<h1>Stylique Virtual Try-On Settings</h1>
			<form method="post" action="options.php">
				<?php
				settings_fields( 'stylique_options' );
				do_settings_sections( 'stylique_options' );
				?>
				<table class="form-table">
					<tr valign="top">
						<th scope="row">Store ID</th>
						<td>
                            <input type="text" name="stylique_store_id" value="<?php echo esc_attr( get_option( 'stylique_store_id' ) ); ?>" />
                            <p class="description">Your unique Store ID from the Stylique Dashboard.</p>
                        </td>
					</tr>
					<tr valign="top">
						<th scope="row">Backend API URL</th>
						<td>
                            <input type="url" name="stylique_backend_url" value="<?php echo esc_attr( get_option( 'stylique_backend_url', 'http://localhost:5000' ) ); ?>" />
                            <p class="description">The base URL of your Stylique backend server (e.g., http://localhost:5000 or https://api.example.com).</p>
                        </td>
					</tr>
					<tr valign="top">
						<th scope="row">Sync Secret</th>
						<td>
                            <input type="password" name="stylique_sync_secret" value="<?php echo esc_attr( get_option( 'stylique_sync_secret' ) ); ?>" autocomplete="new-password" />
                            <p class="description">Shared secret sent to the backend for product sync requests.</p>
                        </td>
					</tr>
					<tr valign="top">
						<th scope="row">Primary Color</th>
						<td><input type="color" name="stylique_primary_color" value="<?php echo esc_attr( get_option( 'stylique_primary_color', '#642FD7' ) ); ?>" /></td>
					</tr>
					<tr valign="top">
						<th scope="row">Secondary Color</th>
						<td><input type="color" name="stylique_secondary_color" value="<?php echo esc_attr( get_option( 'stylique_secondary_color', '#F4536F' ) ); ?>" /></td>
					</tr>
				</table>
				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}

	/* ------------------------------------------------------------------ */
	/*  Frontend                                                           */
	/* ------------------------------------------------------------------ */

	public function enqueue_scripts() {
		if ( ! is_product() ) {
			return;
		}

		global $post;
		if ( ! $post || $post->post_type !== 'product' ) {
			return;
		}

		$product = wc_get_product( $post->ID );
		if ( ! $product ) {
			error_log( '[Stylique] enqueue_scripts: wc_get_product failed for post ' . (int) $post->ID . ' — scripts skipped' );
			return;
		}

		wp_enqueue_script( 'three-js', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', array(), '0.128.0', true );
		wp_enqueue_script( 'three-obj-loader', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js', array('three-js'), '0.128.0', true );

		// Enqueue carousel assets
		wp_enqueue_style('stylique-carousel-style', plugin_dir_url(__FILE__) . 'assets/css/carousel.css', array(), '1.0.0');
		wp_enqueue_script('stylique-carousel-js', plugin_dir_url(__FILE__) . 'assets/js/carousel.js', array(), '1.0.0', true);

		// Main widget modal - comprehensive JavaScript for modal, authentication, try-on, and results
		wp_enqueue_script('stylique-widget-modal', plugin_dir_url(__FILE__) . 'assets/js/widget-modal.js', array('jquery', 'stylique-carousel-js'), '1.9.6', true);
		wp_enqueue_style('stylique-tryon-style', plugin_dir_url(__FILE__) . 'assets/css/tryon-style.css', array(), '1.9.9');

		wp_localize_script( 'stylique-widget-modal', 'styliqueConfig', array(
			'storeId' => get_option( 'stylique_store_id' ),
			'backendUrl' => get_option( 'stylique_backend_url', 'http://localhost:5000' ),
			'colors' => array(
				'primary' => get_option( 'stylique_primary_color', '#642FD7' ),
				'secondary' => get_option( 'stylique_secondary_color', '#F4536F' ),
			),
			'product' => array(
				'id' => $product->get_id(),
				'title' => $product->get_name(),
				'price' => $product->get_price(),
				'image' => wp_get_attachment_url( $product->get_image_id() ),
                'url' => get_permalink( $product->get_id() )
			),
            'siteUrl' => get_site_url()
		));
	}

	public function render_tryon_section() {
		global $post;
		if ( ! $post || $post->post_type !== 'product' ) {
			return;
		}
		$product = wc_get_product( $post->ID );
		if ( ! $product ) {
			return;
		}

		?>
		<div id="stylique-virtual-tryon-container" class="stylique-section">
            <?php include( plugin_dir_path( __FILE__ ) . 'templates/tryon-container-complete.php' ); ?>
		</div>
		<?php
	}

	/* ------------------------------------------------------------------ */
	/*  Sync Hook Layer 2: save_post_product                               */
	/* ------------------------------------------------------------------ */

	public function sync_on_post_save( $post_id, $post, $update ) {
		error_log( '[Stylique][save_post_product] FIRED for post_id=' . $post_id . ' update=' . ( $update ? 'true' : 'false' ) );

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			error_log( '[Stylique][save_post_product] Skipping: DOING_AUTOSAVE' );
			return;
		}
		if ( wp_is_post_revision( $post_id ) ) {
			error_log( '[Stylique][save_post_product] Skipping: is revision' );
			return;
		}
		if ( $post->post_status !== 'publish' ) {
			error_log( '[Stylique][save_post_product] Skipping: status=' . $post->post_status );
			return;
		}

		$this->sync_product_to_backend( $post_id );
	}

	/* ------------------------------------------------------------------ */
	/*  Sync Hook Layer 3: wp_insert_post (all post types)                 */
	/* ------------------------------------------------------------------ */

	public function sync_on_insert_post( $post_id, $post, $update ) {
		if ( $post->post_type !== 'product' ) {
			return;
		}

		error_log( '[Stylique][wp_insert_post] FIRED for product post_id=' . $post_id . ' update=' . ( $update ? 'true' : 'false' ) );

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			error_log( '[Stylique][wp_insert_post] Skipping: DOING_AUTOSAVE' );
			return;
		}
		if ( wp_is_post_revision( $post_id ) ) {
			return;
		}
		if ( $post->post_status !== 'publish' ) {
			error_log( '[Stylique][wp_insert_post] Skipping: status=' . $post->post_status );
			return;
		}

		$this->sync_product_to_backend( $post_id );
	}

	/* ------------------------------------------------------------------ */
	/*  Sync Hook Layer 4: shutdown safety net                             */
	/* ------------------------------------------------------------------ */

	public function shutdown_sync_check() {
		// Only relevant on admin product edit screens
		if ( ! is_admin() ) {
			return;
		}

		// Check if a product was POSTed but never synced
		if ( isset( $_POST['post_type'] ) && $_POST['post_type'] === 'product' && isset( $_POST['post_ID'] ) ) {
			$post_id = intval( $_POST['post_ID'] );

			// Deferred admin sync runs at shutdown priority 99 — do not force a duplicate sync here.
			if ( isset( self::$pending_admin_sync_ids[ $post_id ] ) ) {
				error_log( '[Stylique][shutdown] Product ' . $post_id . ' queued for deferred sync (priority 99) — skipping safety-net duplicate' );
				return;
			}

			if ( $post_id > 0 && ! in_array( $post_id, self::$synced_this_request, true ) ) {
				error_log( '[Stylique][shutdown] Product ' . $post_id . ' was saved but NOT synced by any hook — forcing sync now' );

				$post = get_post( $post_id );
				if ( $post && $post->post_status === 'publish' ) {
					$this->sync_product_to_backend( $post_id );
				}
			} else {
				error_log( '[Stylique][shutdown] Product ' . $post_id . ' was already synced — no action needed' );
			}
		}
	}

	/* ------------------------------------------------------------------ */
	/*  Admin Notices                                                       */
	/* ------------------------------------------------------------------ */

	public function show_sync_notices() {
		// Show transient-based notices (persist through redirect)
		$notice = get_transient( 'stylique_sync_notice_' . get_current_user_id() );
		if ( $notice ) {
			$class = $notice['success'] ? 'notice-success' : 'notice-error';
			echo '<div class="notice ' . esc_attr( $class ) . ' is-dismissible">';
			echo '<p><strong>Stylique Sync:</strong> ' . esc_html( $notice['message'] ) . '</p>';
			echo '</div>';
			delete_transient( 'stylique_sync_notice_' . get_current_user_id() );
		}
	}

	/* ------------------------------------------------------------------ */
	/*  Core Sync Logic                                                    */
	/* ------------------------------------------------------------------ */

	/**
	 * @param mixed $product_id_or_object Product ID or WC_Product
	 * @return int Product ID or 0
	 */
	private function resolve_product_id( $product_id_or_object ) {
		if ( is_int( $product_id_or_object ) || is_numeric( $product_id_or_object ) ) {
			return intval( $product_id_or_object );
		}
		if ( is_object( $product_id_or_object ) && method_exists( $product_id_or_object, 'get_id' ) ) {
			return (int) $product_id_or_object->get_id();
		}
		error_log( '[Stylique][sync] ERROR resolve_product_id: invalid type ' . gettype( $product_id_or_object ) );
		return 0;
	}

	/**
	 * If the browser POST includes gallery IDs but post meta is not written yet, brief wait (same request only).
	 *
	 * @param int $product_id Product ID.
	 */
	private function wait_for_gallery_meta_if_needed( $product_id ) {
		$product_id = (int) $product_id;
		if ( $product_id <= 0 ) {
			return;
		}

		if ( ! isset( $_POST['product_image_gallery'] ) ) {
			error_log( '[Stylique][gallery_wait] product ' . $product_id . ' — no POST product_image_gallery; using DB state only' );
			return;
		}

		$post_csv = sanitize_text_field( wp_unslash( $_POST['product_image_gallery'] ) );
		if ( $post_csv === '' ) {
			error_log( '[Stylique][gallery_wait] product ' . $product_id . ' — POST gallery empty; no wait' );
			return;
		}

		for ( $i = 0; $i < 8; $i++ ) {
			$db = get_post_meta( $product_id, '_product_image_gallery', true );
			if ( is_string( $db ) && $db !== '' ) {
				error_log( '[Stylique][gallery_wait] product ' . $product_id . ' — _product_image_gallery in DB after ' . $i . ' attempt(s): ' . $db );
				return;
			}
			error_log( '[Stylique][gallery_wait] product ' . $product_id . ' — meta not ready, attempt ' . ( $i + 1 ) . '/8 (POST=' . $post_csv . ')' );
			usleep( 100000 );
			wp_cache_delete( $product_id, 'post_meta' );
			clean_post_cache( $product_id );
		}
		error_log( '[Stylique][gallery_wait] product ' . $product_id . ' — still no _product_image_gallery in DB after waits; collect_gallery will use POST/WC fallbacks' );
	}

	/**
	 * Queue admin saves for shutdown (after _product_image_gallery is persisted). Non-admin runs immediately.
	 *
	 * @param mixed $product_id_or_object Product ID (int) or WC_Product object
	 * @param mixed $updated_props        Optional (from woocommerce_product_object_updated_props)
	 */
	public function sync_product_to_backend( $product_id_or_object, $updated_props = null ) {
		$caller = $this->get_caller_hook();
		error_log( '[Stylique][sync_product_to_backend] CALLED via ' . $caller );

		$product_id = $this->resolve_product_id( $product_id_or_object );
		if ( ! $product_id ) {
			return;
		}

		// Admin (not cron): defer one sync per product to shutdown priority 99 so gallery meta exists.
		if ( is_admin() && ! wp_doing_cron() ) {
			self::$pending_admin_sync_ids[ $product_id ] = true;
			if ( ! self::$shutdown_sync_registered ) {
				self::$shutdown_sync_registered = true;
				add_action( 'shutdown', array( $this, 'flush_pending_admin_product_syncs' ), 99 );
			}
			error_log( '[Stylique][sync] Admin context — queued product ' . $product_id . ' for deferred sync on shutdown (priority 99)' );
			return;
		}

		$this->run_product_sync_to_backend( $product_id_or_object, $updated_props );
	}

	/**
	 * Flush deferred admin syncs after WooCommerce has written product meta (including _product_image_gallery).
	 */
	public function flush_pending_admin_product_syncs() {
		$ids = array_keys( self::$pending_admin_sync_ids );
		self::$pending_admin_sync_ids = array();
		self::$shutdown_sync_registered = false;

		foreach ( $ids as $product_id ) {
			$product_id = intval( $product_id );
			if ( $product_id <= 0 ) {
				continue;
			}
			error_log( '[Stylique][sync][flush] Running deferred sync for product ID=' . $product_id );
			$this->run_product_sync_to_backend( $product_id, null );
		}
	}

	/**
	 * @param mixed $product_id_or_object Product ID (int) or WC_Product object
	 * @param mixed $updated_props        Optional (from woocommerce_product_object_updated_props)
	 */
	private function run_product_sync_to_backend( $product_id_or_object, $updated_props = null ) {
		$caller = $this->get_caller_hook();
		error_log( '[Stylique][run_product_sync_to_backend] CALLED via ' . $caller );

		if ( is_int( $product_id_or_object ) || is_numeric( $product_id_or_object ) ) {
			$product_id = intval( $product_id_or_object );
			error_log( '[Stylique][sync] Resolving product object from ID=' . $product_id );
			$product = wc_get_product( $product_id );
		} elseif ( is_object( $product_id_or_object ) && method_exists( $product_id_or_object, 'get_id' ) ) {
			$product = $product_id_or_object;
			$product_id = $product->get_id();
			error_log( '[Stylique][sync] Received product object, ID=' . $product_id );
		} else {
			error_log( '[Stylique][sync] ERROR: Invalid argument type: ' . gettype( $product_id_or_object ) );
			return;
		}

		if ( ! $product ) {
			error_log( '[Stylique][sync] ERROR: wc_get_product returned null for ID=' . $product_id );
			return;
		}

		if ( in_array( $product->get_id(), self::$synced_this_request, true ) ) {
			error_log( '[Stylique][sync] SKIP: product ' . $product->get_id() . ' already synced this request' );
			return;
		}

		error_log( '[Stylique][sync] Product retrieved: ID=' . $product->get_id() . ' name="' . $product->get_name() . '" status=' . $product->get_status() );

		$this->wait_for_gallery_meta_if_needed( $product->get_id() );
		clean_post_cache( $product->get_id() );
		wp_cache_delete( $product->get_id(), 'post_meta' );
		if ( function_exists( 'wc_delete_product_transients' ) ) {
			wc_delete_product_transients( $product->get_id() );
		}
		$refreshed = wc_get_product( $product->get_id() );
		if ( $refreshed ) {
			$product = $refreshed;
		}

		$backend_url = get_option( 'stylique_backend_url', 'http://localhost:5000' );
		$store_id    = get_option( 'stylique_store_id' );
		$store_domain = isset( $_SERVER['HTTP_HOST'] ) ? sanitize_text_field( $_SERVER['HTTP_HOST'] ) : wp_parse_url( get_site_url(), PHP_URL_HOST );

		error_log( '[Stylique][sync] Config — backend_url=' . $backend_url . ' store_id=' . $store_id . ' store_domain=' . $store_domain );

		if ( ! $backend_url || ! $store_id ) {
			error_log( '[Stylique][sync] ABORT: backend_url or store_id not configured' );
			$this->store_sync_notice( false, 'Sync skipped: Backend URL or Store ID not configured in Stylique settings.' );
			return;
		}

		// Build payload
		$product_data = array(
			'store_domain' => $store_domain,
			'product'      => array(
				'id'          => $product->get_id(),
				'name'        => $product->get_name(),
				'description' => wp_strip_all_tags( $product->get_description() ), // Strip HTML tags for plain text display
				'price'       => $product->get_price(),
				'permalink'   => $product->get_permalink(),
				'images'      => $this->get_product_images( $product ),
				'variants'    => $this->get_product_variants( $product ),
			),
		);

		$images_count = count( $product_data['product']['images'] );
		$variants_count = count( $product_data['product']['variants'] );
		error_log( '[Stylique][sync] Payload built: images=' . $images_count . ' variants=' . $variants_count );
		error_log( '[Stylique][sync] Payload JSON: ' . wp_json_encode( $product_data ) );

		// Send to backend
		$result = $this->send_to_backend( $backend_url, $product_data );

		// Mark as synced
		self::$synced_this_request[] = $product->get_id();

		// Store admin notice
		if ( $result['success'] ) {
			$msg = 'Product "' . $product->get_name() . '" (ID ' . $product->get_id() . ') synced successfully! Status ' . $result['status_code'];
			$this->store_sync_notice( true, $msg );
		} else {
			$msg = 'Product "' . $product->get_name() . '" (ID ' . $product->get_id() . ') sync FAILED: ' . $result['error'];
			$this->store_sync_notice( false, $msg );
		}
	}

	/* ------------------------------------------------------------------ */
	/*  Product Data Helpers                                               */
	/* ------------------------------------------------------------------ */

	/**
	 * Gallery attachment IDs: _product_image_gallery meta (canonical), POST fallback, then WC object.
	 *
	 * @param int        $product_id Product ID.
	 * @param WC_Product $product    Product object.
	 * @return int[] Attachment IDs (order preserved, unique).
	 */
	private function collect_gallery_attachment_ids( $product_id, $product ) {
		$ids_ordered = array();
		$raw_meta    = get_post_meta( $product_id, '_product_image_gallery', true );

		$raw_log = is_string( $raw_meta ) ? $raw_meta : ( $raw_meta ? wp_json_encode( $raw_meta ) : '' );
		error_log( '[Stylique][gallery_meta] product ' . $product_id . ' _product_image_gallery raw: ' . ( $raw_log !== '' ? $raw_log : '(empty)' ) );

		if ( is_string( $raw_meta ) && $raw_meta !== '' ) {
			foreach ( explode( ',', $raw_meta ) as $part ) {
				$aid = absint( trim( $part ) );
				if ( $aid > 0 ) {
					$ids_ordered[] = $aid;
				}
			}
		}

		if ( empty( $ids_ordered ) && isset( $_POST['post_ID'], $_POST['product_image_gallery'] ) && absint( $_POST['post_ID'] ) === (int) $product_id ) {
			$csv = sanitize_text_field( wp_unslash( $_POST['product_image_gallery'] ) );
			error_log( '[Stylique][gallery_meta] product ' . $product_id . ' POST product_image_gallery fallback: ' . $csv );
			foreach ( explode( ',', $csv ) as $part ) {
				$aid = absint( trim( $part ) );
				if ( $aid > 0 ) {
					$ids_ordered[] = $aid;
				}
			}
		}

		$wc_gallery = $product ? $product->get_gallery_image_ids() : array();
		if ( ! empty( $wc_gallery ) ) {
			error_log( '[Stylique][gallery_meta] product ' . $product_id . ' WC_Product::get_gallery_image_ids count=' . count( $wc_gallery ) );
			foreach ( $wc_gallery as $gid ) {
				$gid = absint( $gid );
				if ( $gid > 0 && ! in_array( $gid, $ids_ordered, true ) ) {
					$ids_ordered[] = $gid;
				}
			}
		}

		$ids_ordered = array_values( array_unique( array_map( 'absint', $ids_ordered ) ) );
		error_log( '[Stylique][gallery_meta] product ' . $product_id . ' merged gallery ID count=' . count( $ids_ordered ) . ' ids=[' . implode( ',', $ids_ordered ) . ']' );

		return $ids_ordered;
	}

	private function get_product_images( $product ) {
		$product_id  = $product->get_id();
		$images      = array();
		$featured_id = absint( $product->get_image_id() );

		if ( $featured_id ) {
			$url = wp_get_attachment_url( $featured_id );
			if ( $url ) {
				$alt = get_post_meta( $featured_id, '_wp_attachment_image_alt', true );
				$images[] = array(
					'src' => $url,
					'alt' => $alt ? $alt : $product->get_name() . ' - featured',
				);
			}
		}

		$gallery_ids = $this->collect_gallery_attachment_ids( $product_id, $product );
		$gidx        = 0;
		foreach ( $gallery_ids as $image_id ) {
			if ( $featured_id && (int) $image_id === $featured_id ) {
				continue;
			}
			$url = wp_get_attachment_url( $image_id );
			if ( ! $url ) {
				continue;
			}
			$alt = get_post_meta( $image_id, '_wp_attachment_image_alt', true );
			$gidx++;
			$images[] = array(
				'src' => $url,
				'alt' => $alt ? $alt : $product->get_name() . ' - gallery ' . $gidx,
			);
		}

		error_log( '[Stylique][get_product_images] product ' . $product_id . ' sending total=' . count( $images ) . ' (featured=' . ( $featured_id ? 'yes' : 'no' ) . ', gallery_slots_in_meta=' . count( $gallery_ids ) . ')' );

		return $images;
	}

	private function get_product_variants( $product ) {
		$variants = array();

		if ( $product instanceof WC_Product_Variable ) {
			$variations = $product->get_available_variations();

			foreach ( $variations as $variation_id ) {
				$variation = wc_get_product( $variation_id );
				if ( ! $variation ) {
					continue;
				}
				$variant_data = array(
					'price'      => $variation->get_price(),
					'attributes' => array(),
				);

				$attributes = $variation->get_attributes();
				foreach ( $attributes as $attr_name => $attr_value ) {
					$variant_data['attributes'][] = array(
						'name'   => wc_attribute_label( $attr_name ),
						'option' => $attr_value,
					);
				}

				$variants[] = $variant_data;
			}
		} else {
			$variants[] = array(
				'price'      => $product->get_price(),
				'attributes' => array(),
			);
		}

		return $variants;
	}

	/* ------------------------------------------------------------------ */
	/*  HTTP: Send to Backend                                              */
	/* ------------------------------------------------------------------ */

	private function send_to_backend( $backend_url, $product_data ) {
		$backend_url = rtrim( $backend_url, '/' );
		$endpoint    = $backend_url . '/api/sync/woocommerce';

		error_log( '[Stylique][HTTP] POST ' . $endpoint );
		error_log( '[Stylique][HTTP] Body length: ' . strlen( wp_json_encode( $product_data ) ) . ' bytes' );

		$headers = array( 'Content-Type' => 'application/json' );
		$sync_secret = get_option( 'stylique_sync_secret' );
		if ( $sync_secret ) {
			$headers['X-Stylique-Sync-Secret'] = $sync_secret;
		}

		$response = wp_remote_post( $endpoint, array(
			'method'  => 'POST',
			'headers' => $headers,
			'body'    => wp_json_encode( $product_data ),
			'timeout' => 15,
		) );

		if ( is_wp_error( $response ) ) {
			$err = $response->get_error_message();
			error_log( '[Stylique][HTTP] WP_Error: ' . $err );
			return array( 'success' => false, 'error' => $err, 'status_code' => 0 );
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$body        = wp_remote_retrieve_body( $response );

		error_log( '[Stylique][HTTP] Response status=' . $status_code );
		error_log( '[Stylique][HTTP] Response body: ' . $body );

		if ( $status_code >= 200 && $status_code < 300 ) {
			error_log( '[Stylique][HTTP] SUCCESS' );
			return array( 'success' => true, 'error' => '', 'status_code' => $status_code );
		}

		error_log( '[Stylique][HTTP] FAILURE status=' . $status_code );
		return array( 'success' => false, 'error' => 'HTTP ' . $status_code . ': ' . $body, 'status_code' => $status_code );
	}

	/* ------------------------------------------------------------------ */
	/*  Helpers                                                            */
	/* ------------------------------------------------------------------ */

	private function store_sync_notice( $success, $message ) {
		error_log( '[Stylique][notice] ' . ( $success ? 'SUCCESS' : 'FAIL' ) . ': ' . $message );

		$user_id = get_current_user_id();
		if ( $user_id ) {
			set_transient( 'stylique_sync_notice_' . $user_id, array(
				'success' => $success,
				'message' => $message,
			), 60 );
		}
	}

	private function get_caller_hook() {
		$hooks = array(
			'woocommerce_new_product',
			'woocommerce_update_product',
			'woocommerce_product_object_updated_props',
			'save_post_product',
			'wp_insert_post',
		);

		foreach ( $hooks as $hook ) {
			if ( doing_action( $hook ) ) {
				return $hook;
			}
		}

		// Check backtrace for shutdown
		$trace = debug_backtrace( DEBUG_BACKTRACE_IGNORE_ARGS, 5 );
		foreach ( $trace as $frame ) {
			if ( isset( $frame['function'] ) && $frame['function'] === 'shutdown_sync_check' ) {
				return 'shutdown';
			}
		}

		return 'unknown';
	}
}

new Stylique_Virtual_TryOn();
