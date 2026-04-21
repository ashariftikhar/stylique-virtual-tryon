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

define( 'STYLIQUE_PLUGIN_VERSION', '1.9.6' );
define( 'STYLIQUE_DEFAULT_BACKEND_URL', 'https://stylique-api.onrender.com' );

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
		add_action( 'admin_post_stylique_connect_store', array( $this, 'handle_connect_store' ) );
		add_action( 'wp_ajax_stylique_bulk_sync_products', array( $this, 'ajax_bulk_sync_products' ) );

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
		$backend_url = esc_url( get_option( 'stylique_backend_url', STYLIQUE_DEFAULT_BACKEND_URL ) );
		$store_id    = get_option( 'stylique_store_id' );
		$last_sync   = get_option( 'stylique_last_bulk_sync', array() );
		?>
		<div class="wrap">
			<h1>Stylique Virtual Try-On Settings</h1>
			<div class="card" style="max-width: 860px; padding: 18px; margin-top: 16px;">
				<h2 style="margin-top: 0;">Connect Stylique</h2>
				<p>Connect this WooCommerce store to Stylique. This creates or links your Store Panel account, saves the Store ID, and generates a secure product sync secret automatically.</p>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<?php wp_nonce_field( 'stylique_connect_store', 'stylique_connect_nonce' ); ?>
					<input type="hidden" name="action" value="stylique_connect_store" />
					<table class="form-table" role="presentation">
						<tr valign="top">
							<th scope="row">Backend API URL</th>
							<td>
								<input type="url" name="stylique_backend_url" value="<?php echo esc_attr( $backend_url ); ?>" class="regular-text" />
								<p class="description">Packaged default: <?php echo esc_html( STYLIQUE_DEFAULT_BACKEND_URL ); ?>. Replace this for client delivery if their backend is hosted elsewhere.</p>
							</td>
						</tr>
						<tr valign="top">
							<th scope="row">Connection Status</th>
							<td>
								<?php if ( $store_id ) : ?>
									<p><strong>Connected Store ID:</strong> <code><?php echo esc_html( $store_id ); ?></code></p>
								<?php else : ?>
									<p>Not connected yet.</p>
								<?php endif; ?>
							</td>
						</tr>
					</table>
					<?php submit_button( $store_id ? 'Reconnect Stylique' : 'Connect Stylique', 'primary', 'submit', false ); ?>
				</form>
			</div>
			<div class="card" style="max-width: 860px; padding: 18px; margin-top: 16px;">
				<h2 style="margin-top: 0;">Sync Existing Products</h2>
				<p>Push all published WooCommerce products to Stylique in batches of 20. New and updated products will still auto-sync when saved.</p>
				<?php if ( ! empty( $last_sync ) && is_array( $last_sync ) ) : ?>
					<p>
						<strong>Last bulk sync:</strong>
						<?php echo esc_html( isset( $last_sync['status'] ) ? $last_sync['status'] : 'unknown' ); ?>
						<?php if ( ! empty( $last_sync['finished_at'] ) ) : ?>
							at <?php echo esc_html( $last_sync['finished_at'] ); ?>
						<?php endif; ?>
					</p>
					<p>
						Synced: <strong><?php echo esc_html( isset( $last_sync['synced'] ) ? (int) $last_sync['synced'] : 0 ); ?></strong>,
						Failed: <strong><?php echo esc_html( isset( $last_sync['failed'] ) ? (int) $last_sync['failed'] : 0 ); ?></strong>,
						Total: <strong><?php echo esc_html( isset( $last_sync['total'] ) ? (int) $last_sync['total'] : 0 ); ?></strong>
					</p>
					<?php if ( ! empty( $last_sync['last_error'] ) ) : ?>
						<p><strong>Last error:</strong> <?php echo esc_html( $last_sync['last_error'] ); ?></p>
					<?php endif; ?>
				<?php endif; ?>
				<p>
					<button
						type="button"
						id="stylique-sync-all-products"
						class="button button-secondary"
						data-nonce="<?php echo esc_attr( wp_create_nonce( 'stylique_bulk_sync_products' ) ); ?>"
						<?php disabled( empty( $store_id ) ); ?>
					>
						Sync All Products
					</button>
				</p>
				<div id="stylique-bulk-sync-status" style="margin-top: 10px;"></div>
				<?php if ( empty( $store_id ) ) : ?>
					<p class="description">Connect Stylique first before syncing existing products.</p>
				<?php endif; ?>
			</div>
			<script>
				(function() {
					var button = document.getElementById('stylique-sync-all-products');
					var statusBox = document.getElementById('stylique-bulk-sync-status');
					if (!button || !statusBox) {
						return;
					}

					function setStatus(message, isError) {
						statusBox.innerHTML = '';
						var paragraph = document.createElement('p');
						if (isError) {
							paragraph.style.color = '#b32d2e';
						}
						paragraph.textContent = message;
						statusBox.appendChild(paragraph);
					}

					button.addEventListener('click', function() {
						var nonce = button.getAttribute('data-nonce');
						var offset = 0;
						var synced = 0;
						var failed = 0;
						var total = 0;
						var lastError = '';
						button.disabled = true;
						setStatus('Starting bulk sync...', false);

						function runBatch() {
							var body = new URLSearchParams();
							body.set('action', 'stylique_bulk_sync_products');
							body.set('nonce', nonce);
							body.set('offset', String(offset));
							body.set('synced', String(synced));
							body.set('failed', String(failed));
							body.set('last_error', lastError);

							fetch(ajaxurl, {
								method: 'POST',
								credentials: 'same-origin',
								headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
								body: body.toString()
							})
								.then(function(response) { return response.json(); })
								.then(function(result) {
									if (!result || !result.success) {
										var message = result && result.data && result.data.message ? result.data.message : 'Bulk sync failed.';
										throw new Error(message);
									}

									var data = result.data;
									offset = data.next_offset;
									synced = data.synced;
									failed = data.failed;
									total = data.total;
									lastError = data.last_error || '';

									setStatus(
										'Processed ' + data.processed + ' of ' + total + ' products. Synced: ' + synced + '. Failed: ' + failed + (lastError ? '. Last error: ' + lastError : ''),
										false
									);

									if (data.done) {
										button.disabled = false;
										setStatus('Bulk sync complete. Synced: ' + synced + '. Failed: ' + failed + '. Total: ' + total + '.', failed > 0);
										return;
									}

									runBatch();
								})
								.catch(function(error) {
									button.disabled = false;
									setStatus(error.message || 'Bulk sync failed.', true);
								});
						}

						runBatch();
					});
				})();
			</script>
			<hr />
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
                            <input type="url" name="stylique_backend_url" value="<?php echo esc_attr( get_option( 'stylique_backend_url', STYLIQUE_DEFAULT_BACKEND_URL ) ); ?>" />
                            <p class="description">The base URL of your Stylique backend server. Packaged default: <?php echo esc_html( STYLIQUE_DEFAULT_BACKEND_URL ); ?>.</p>
                        </td>
					</tr>
					<tr valign="top">
						<th scope="row">Sync Secret</th>
						<td>
                            <input type="password" name="stylique_sync_secret" value="<?php echo esc_attr( get_option( 'stylique_sync_secret' ) ); ?>" autocomplete="new-password" />
                            <p class="description">Generated automatically by Connect Stylique and sent to the backend for product sync requests.</p>
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

	public function handle_connect_store() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to connect Stylique.', 'stylique' ) );
		}

		check_admin_referer( 'stylique_connect_store', 'stylique_connect_nonce' );

		$redirect_url = admin_url( 'options-general.php?page=stylique-virtual-tryon' );
		$backend_url  = isset( $_POST['stylique_backend_url'] )
			? esc_url_raw( wp_unslash( $_POST['stylique_backend_url'] ) )
			: get_option( 'stylique_backend_url', STYLIQUE_DEFAULT_BACKEND_URL );
		$backend_url  = rtrim( $backend_url ? $backend_url : STYLIQUE_DEFAULT_BACKEND_URL, '/' );

		if ( ! wp_http_validate_url( $backend_url ) ) {
			$this->store_sync_notice( false, 'Connection failed: Backend API URL is not valid.' );
			wp_safe_redirect( $redirect_url );
			exit;
		}

		update_option( 'stylique_backend_url', $backend_url );

		$site_url = get_site_url();
		$payload  = array(
			'store_domain'   => wp_parse_url( $site_url, PHP_URL_HOST ),
			'site_url'       => $site_url,
			'store_name'     => get_bloginfo( 'name' ),
			'admin_email'    => get_option( 'admin_email' ),
			'plugin_version' => STYLIQUE_PLUGIN_VERSION,
		);

		$response = wp_remote_post( $backend_url . '/api/woocommerce/connect', array(
			'method'  => 'POST',
			'headers' => array( 'Content-Type' => 'application/json' ),
			'body'    => wp_json_encode( $payload ),
			'timeout' => 20,
		) );

		if ( is_wp_error( $response ) ) {
			$this->store_sync_notice( false, 'Connection failed: ' . $response->get_error_message() );
			wp_safe_redirect( $redirect_url );
			exit;
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$body        = wp_remote_retrieve_body( $response );
		$data        = json_decode( $body, true );

		if ( $status_code < 200 || $status_code >= 300 || ! is_array( $data ) || empty( $data['success'] ) ) {
			$message = is_array( $data ) && ! empty( $data['message'] ) ? $data['message'] : $body;
			$this->store_sync_notice( false, 'Connection failed: HTTP ' . $status_code . ' ' . wp_strip_all_tags( (string) $message ) );
			wp_safe_redirect( $redirect_url );
			exit;
		}

		if ( empty( $data['store_id'] ) || empty( $data['sync_secret'] ) || empty( $data['password_once'] ) ) {
			$this->store_sync_notice( false, 'Connection failed: Backend response was missing setup credentials.' );
			wp_safe_redirect( $redirect_url );
			exit;
		}

		update_option( 'stylique_store_id', sanitize_text_field( $data['store_id'] ) );
		update_option( 'stylique_sync_secret', sanitize_text_field( $data['sync_secret'] ) );

		set_transient( 'stylique_connect_credentials_' . get_current_user_id(), array(
			'store_id'        => sanitize_text_field( $data['store_id'] ),
			'password_once'   => sanitize_text_field( $data['password_once'] ),
			'store_panel_url' => ! empty( $data['store_panel_url'] ) ? esc_url_raw( $data['store_panel_url'] ) : '',
		), 10 * MINUTE_IN_SECONDS );

		$this->store_sync_notice( true, 'WooCommerce store connected successfully. Save the one-time Store Panel password shown below.' );
		wp_safe_redirect( $redirect_url );
		exit;
	}

	public function ajax_bulk_sync_products() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'You do not have permission to sync products.' ), 403 );
		}

		check_ajax_referer( 'stylique_bulk_sync_products', 'nonce' );

		$backend_url = get_option( 'stylique_backend_url', STYLIQUE_DEFAULT_BACKEND_URL );
		$store_id    = get_option( 'stylique_store_id' );
		$sync_secret = get_option( 'stylique_sync_secret' );

		if ( ! $backend_url || ! $store_id || ! $sync_secret ) {
			wp_send_json_error( array( 'message' => 'Connect Stylique before running bulk sync.' ), 400 );
		}

		$limit      = 20;
		$offset     = isset( $_POST['offset'] ) ? max( 0, intval( $_POST['offset'] ) ) : 0;
		$synced     = isset( $_POST['synced'] ) ? max( 0, intval( $_POST['synced'] ) ) : 0;
		$failed     = isset( $_POST['failed'] ) ? max( 0, intval( $_POST['failed'] ) ) : 0;
		$last_error = isset( $_POST['last_error'] ) ? sanitize_text_field( wp_unslash( $_POST['last_error'] ) ) : '';

		$query = new WP_Query( array(
			'post_type'      => 'product',
			'post_status'    => 'publish',
			'fields'         => 'ids',
			'posts_per_page' => $limit,
			'offset'         => $offset,
			'orderby'        => 'ID',
			'order'          => 'ASC',
			'no_found_rows'  => false,
		) );

		$total = (int) $query->found_posts;
		$ids   = array_map( 'intval', $query->posts );

		foreach ( $ids as $product_id ) {
			$result = $this->run_product_sync_to_backend( $product_id, null, false );
			if ( ! empty( $result['success'] ) ) {
				$synced++;
			} else {
				$failed++;
				$last_error = 'Product ' . $product_id . ': ' . ( isset( $result['error'] ) ? $result['error'] : 'Unknown sync error' );
			}
		}

		wp_reset_postdata();

		$processed   = min( $total, $offset + count( $ids ) );
		$next_offset = $offset + count( $ids );
		$done        = $processed >= $total || count( $ids ) === 0;
		$status      = $done ? ( $failed > 0 ? 'completed_with_errors' : 'completed' ) : 'in_progress';
		$summary     = array(
			'status'      => $status,
			'total'       => $total,
			'processed'   => $processed,
			'synced'      => $synced,
			'failed'      => $failed,
			'last_error'  => $last_error,
			'finished_at' => $done ? current_time( 'mysql' ) : '',
			'updated_at'  => current_time( 'mysql' ),
		);

		update_option( 'stylique_last_bulk_sync', $summary, false );

		wp_send_json_success( array(
			'total'       => $total,
			'processed'   => $processed,
			'synced'      => $synced,
			'failed'      => $failed,
			'last_error'  => $last_error,
			'next_offset' => $next_offset,
			'done'        => $done,
		) );
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
		wp_enqueue_style('stylique-tryon-style', plugin_dir_url(__FILE__) . 'assets/css/tryon-style.css', array(), '2.0.4');

		wp_localize_script( 'stylique-widget-modal', 'styliqueConfig', array(
			'storeId' => get_option( 'stylique_store_id' ),
			'backendUrl' => get_option( 'stylique_backend_url', STYLIQUE_DEFAULT_BACKEND_URL ),
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

		$credentials = get_transient( 'stylique_connect_credentials_' . get_current_user_id() );
		if ( $credentials ) {
			echo '<div class="notice notice-success is-dismissible">';
			echo '<p><strong>Stylique Store Panel Credentials</strong></p>';
			echo '<p>Store ID: <code>' . esc_html( $credentials['store_id'] ) . '</code></p>';
			echo '<p>One-time password: <code>' . esc_html( $credentials['password_once'] ) . '</code></p>';
			if ( ! empty( $credentials['store_panel_url'] ) ) {
				echo '<p><a class="button button-secondary" href="' . esc_url( $credentials['store_panel_url'] ) . '" target="_blank" rel="noopener">Open Store Panel</a></p>';
			}
			echo '<p><em>Copy this password now. For security, it is shown only after connection.</em></p>';
			echo '</div>';
			delete_transient( 'stylique_connect_credentials_' . get_current_user_id() );
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
	private function run_product_sync_to_backend( $product_id_or_object, $updated_props = null, $store_notice = true ) {
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
			return array( 'success' => false, 'error' => 'Invalid product argument', 'status_code' => 0 );
		}

		if ( ! $product ) {
			error_log( '[Stylique][sync] ERROR: wc_get_product returned null for ID=' . $product_id );
			return array( 'success' => false, 'error' => 'WooCommerce product not found', 'status_code' => 0 );
		}

		if ( in_array( $product->get_id(), self::$synced_this_request, true ) ) {
			error_log( '[Stylique][sync] SKIP: product ' . $product->get_id() . ' already synced this request' );
			return array( 'success' => true, 'error' => '', 'status_code' => 0, 'skipped' => true );
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

		$backend_url = get_option( 'stylique_backend_url', STYLIQUE_DEFAULT_BACKEND_URL );
		$store_id    = get_option( 'stylique_store_id' );
		$store_domain = isset( $_SERVER['HTTP_HOST'] ) ? sanitize_text_field( $_SERVER['HTTP_HOST'] ) : wp_parse_url( get_site_url(), PHP_URL_HOST );

		error_log( '[Stylique][sync] Config — backend_url=' . $backend_url . ' store_id=' . $store_id . ' store_domain=' . $store_domain );

		if ( ! $backend_url || ! $store_id ) {
			error_log( '[Stylique][sync] ABORT: backend_url or store_id not configured' );
			if ( $store_notice ) {
				$this->store_sync_notice( false, 'Sync skipped: Backend URL or Store ID not configured in Stylique settings.' );
			}
			return array( 'success' => false, 'error' => 'Backend URL or Store ID not configured', 'status_code' => 0 );
		}

		$product_data = $this->build_product_sync_payload( $product, $store_id, $store_domain );

		$images_count = count( $product_data['product']['images'] );
		$variants_count = count( $product_data['product']['variants'] );
		error_log( '[Stylique][sync] Payload built: images=' . $images_count . ' variants=' . $variants_count );
		error_log( '[Stylique][sync] Payload JSON: ' . wp_json_encode( $product_data ) );

		// Send to backend
		$result = $this->send_to_backend( $backend_url, $product_data );

		// Mark as synced
		self::$synced_this_request[] = $product->get_id();

		// Store admin notice
		if ( $store_notice ) {
			if ( $result['success'] ) {
				$msg = 'Product "' . $product->get_name() . '" (ID ' . $product->get_id() . ') synced successfully! Status ' . $result['status_code'];
				$this->store_sync_notice( true, $msg );
			} else {
				$msg = 'Product "' . $product->get_name() . '" (ID ' . $product->get_id() . ') sync FAILED: ' . $result['error'];
				$this->store_sync_notice( false, $msg );
			}
		}

		$result['product_id'] = $product->get_id();
		$result['product_name'] = $product->get_name();
		return $result;
	}

	private function build_product_sync_payload( $product, $store_id, $store_domain ) {
		return array(
			'store_domain' => $store_id,
			'site_domain'  => $store_domain,
			'product'      => array(
				'id'          => $product->get_id(),
				'name'        => $product->get_name(),
				'description' => wp_strip_all_tags( $product->get_description() ),
				'price'       => $product->get_price(),
				'permalink'   => $product->get_permalink(),
				'images'      => $this->get_product_images( $product ),
				'variants'    => $this->get_product_variants( $product ),
			),
		);
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
