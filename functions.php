<?php
/**
 * PakMunshi Astra Child Theme - Functions
 * Designed and Developed by Sami Khan - SQ Tech
 */

// Enqueue Parent + Child + Premium Legal CSS
add_action( 'wp_enqueue_scripts', 'pakmunshi_child_enqueue_styles', 20 );
function pakmunshi_child_enqueue_styles() {
    // Parent Astra theme
    wp_enqueue_style(
        'astra-parent-style',
        get_template_directory_uri() . '/style.css'
    );

    // Google Fonts - Playfair Display + Inter
    wp_enqueue_style(
        'pakmunshi-google-fonts',
        'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap',
        array(),
        null
    );

    // Child theme base style
    wp_enqueue_style(
        'pakmunshi-child-style',
        get_stylesheet_directory_uri() . '/style.css',
        array( 'astra-parent-style' ),
        wp_get_theme()->get( 'Version' )
    );

    // Premium Legal Design CSS
    wp_enqueue_style(
        'pakmunshi-legal-premium',
        get_stylesheet_directory_uri() . '/legal-premium.css',
        array( 'pakmunshi-child-style' ),
        '2.0.0'
    );
}

// Add smooth scroll behavior
add_action( 'wp_head', 'pakmunshi_add_smooth_scroll' );
function pakmunshi_add_smooth_scroll() {
    echo '<style>html { scroll-behavior: smooth; }</style>';
}

// Add premium body class
add_filter( 'body_class', 'pakmunshi_body_classes' );
function pakmunshi_body_classes( $classes ) {
    $classes[] = 'pakmunshi-legal-pro';
    if ( is_front_page() ) {
        $classes[] = 'pakmunshi-home';
    }
    return $classes;
}

// Remove Astra default blog layout on homepage
add_filter( 'astra_theme_defaults', 'pakmunshi_astra_defaults' );
function pakmunshi_astra_defaults( $defaults ) {
    $defaults['blog-post-structure'] = array( 'image', 'title-meta' );
    return $defaults;
}
