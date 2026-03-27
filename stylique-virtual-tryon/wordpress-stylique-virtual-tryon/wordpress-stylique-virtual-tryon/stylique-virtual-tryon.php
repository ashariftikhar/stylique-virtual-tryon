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
		// Scripts - explicitly depend on 'jquery' and 'jquery-core' just in case
		// Added version 1.1 to force cache bust
		wp_enqueue_script('stylique-tryon-script', plugin_dir_url(__FILE__) . 'assets/js/tryon-script.js', array('jquery'), '1.9.3', true);

		// Plugin Styles
		// Enqueue Frontend Scripts & Styles
		wp_enqueue_style('stylique-tryon-style', plugin_dir_url(__FILE__) . 'assets/css/tryon-style.css', array(), '1.9.3');

		// Pass PHP data to JS
		wp_localize_script( 'stylique-tryon-script', 'styliqueConfig', array(
			'storeId' => get_option( 'stylique_store_id' ),
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
}

new Stylique_Virtual_TryOn();
