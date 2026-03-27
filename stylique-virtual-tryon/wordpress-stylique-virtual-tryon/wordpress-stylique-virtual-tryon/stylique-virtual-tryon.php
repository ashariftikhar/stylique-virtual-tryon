<?php
/**
 * Plugin Name: Stylique Virtual Try-On
 * Plugin URI: https://styliquetechnologies.com
 * Description: Adds AI-powered Virtual Try-On and Size Recommendations to your WooCommerce product pages.
 * Version: 1.9.3
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

	public function __construct() {
		// Admin Settings
		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );

		// Frontend Assets
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );

		// Frontend Content Injection
		add_action( 'woocommerce_after_add_to_cart_form', array( $this, 'render_tryon_section' ), 30 );

		// Product Sync Hook
		add_action( 'woocommerce_product_object_updated_props', array( $this, 'sync_product_to_backend' ), 10, 2 );
	}

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

	public function enqueue_scripts() {
		if ( ! is_product() ) {
			return;
		}

		global $post;
		$product = wc_get_product( $post->ID );

		// Three.js (Required for 3D)
		wp_enqueue_script( 'three-js', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', array(), '0.128.0', true );
		wp_enqueue_script( 'three-obj-loader', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js', array('three-js'), '0.128.0', true );

		// Main Plugin Script
		wp_enqueue_script('stylique-tryon-script', plugin_dir_url(__FILE__) . 'assets/js/tryon-script.js', array('jquery'), '1.9.3', true);

		// Backend Integration Script
		wp_enqueue_script('stylique-backend-integration', plugin_dir_url(__FILE__) . 'assets/js/tryon-backend-integration.js', array('stylique-tryon-script'), '1.9.3', true);

		// Plugin Styles
		wp_enqueue_style('stylique-tryon-style', plugin_dir_url(__FILE__) . 'assets/css/tryon-style.css', array(), '1.9.3');

		// Pass PHP data to JS
		wp_localize_script( 'stylique-tryon-script', 'styliqueConfig', array(
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
		// Output the main container
        // The inner HTML will be populated by the JS/CSS from the assets
		?>
		<div id="stylique-virtual-tryon-container" class="stylique-section">
            <!-- Content injected by JS/HTML structure matching the original Liquid file -->
            <?php include( plugin_dir_path( __FILE__ ) . 'templates/tryon-container.php' ); ?>
		</div>
		<?php
	}

	/**
	 * Sync WooCommerce product to backend when it's updated
	 * 
	 * @param WC_Product $product The product object
	 * @param array $updated_props Array of updated properties
	 */
	public function sync_product_to_backend( $product, $updated_props ) {
		$backend_url = get_option( 'stylique_backend_url', 'http://localhost:5000' );
		$store_id = get_option( 'stylique_store_id' );

		// Only sync if we have the necessary config
		if ( ! $backend_url || ! $store_id ) {
			error_log( 'Stylique: Backend URL or Store ID not configured' );
			return;
		}

		// Prepare product data for backend
		$product_data = array(
			'store_domain' => isset( $_SERVER['HTTP_HOST'] ) ? sanitize_text_field( $_SERVER['HTTP_HOST'] ) : get_site_url(),
			'product' => array(
				'id' => $product->get_id(),
				'name' => $product->get_name(),
				'description' => $product->get_description(),
				'price' => $product->get_price(),
				'permalink' => $product->get_permalink(),
				'images' => $this->get_product_images( $product ),
				'variants' => $this->get_product_variants( $product ),
			),
		);

		// Send to backend
		$this->send_to_backend( $backend_url, $product_data );
	}

	/**
	 * Get all product images
	 */
	private function get_product_images( $product ) {
		$images = array();
		
		// Main image
		if ( $product->get_image_id() ) {
			$images[] = array(
				'src' => wp_get_attachment_url( $product->get_image_id() ),
				'alt' => $product->get_name(),
			);
		}

		// Gallery images
		$gallery_ids = $product->get_gallery_image_ids();
		if ( $gallery_ids ) {
			foreach ( $gallery_ids as $image_id ) {
				$images[] = array(
					'src' => wp_get_attachment_url( $image_id ),
					'alt' => $product->get_name(),
				);
			}
		}

		return $images;
	}

	/**
	 * Get product variants (sizes) from variations
	 */
	private function get_product_variants( $product ) {
		$variants = array();

		// Check if product is variable
		if ( $product instanceof WC_Product_Variable ) {
			$variations = $product->get_available_variations();

			foreach ( $variations as $variation_id ) {
				$variation = wc_get_product( $variation_id );
				$variant_data = array(
					'price' => $variation->get_price(),
					'attributes' => array(),
				);

				// Get attributes (size, color, etc.)
				$attributes = $variation->get_attributes();
				foreach ( $attributes as $attr_name => $attr_value ) {
					$variant_data['attributes'][] = array(
						'name' => wc_attribute_label( $attr_name ),
						'option' => $attr_value,
					);
				}

				$variants[] = $variant_data;
			}
		} else {
			// Simple product - single variant
			$variants[] = array(
				'price' => $product->get_price(),
				'attributes' => array(),
			);
		}

		return $variants;
	}

	/**
	 * Send product data to backend API
	 */
	private function send_to_backend( $backend_url, $product_data ) {
		// Remove trailing slash from URL
		$backend_url = rtrim( $backend_url, '/' );
		$endpoint = $backend_url . '/api/sync/woocommerce';

		$response = wp_remote_post( $endpoint, array(
			'method' => 'POST',
			'headers' => array(
				'Content-Type' => 'application/json',
			),
			'body' => wp_json_encode( $product_data ),
			'timeout' => 10,
		) );

		// Log response
		if ( is_wp_error( $response ) ) {
			error_log( 'Stylique API Error: ' . $response->get_error_message() );
		} else {
			$status_code = wp_remote_retrieve_response_code( $response );
			if ( $status_code >= 200 && $status_code < 300 ) {
				error_log( 'Stylique: Product synced successfully (Status: ' . $status_code . ')' );
			} else {
				$body = wp_remote_retrieve_body( $response );
				error_log( 'Stylique API Error (Status: ' . $status_code . '): ' . $body );
			}
		}
	}
}

new Stylique_Virtual_TryOn();
