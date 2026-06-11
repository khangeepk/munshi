<?php
/**
 * PakMunshi Final Fix - Sami Khan SQ Tech
 * Cleans pak-munshi-pro folder and writes correct plugin file
 * DELETE AFTER USE
 */
echo "<style>body{font-family:sans-serif;padding:20px;background:#0b0f19;color:#f9fafb;} h2{color:#2563eb;} .ok{color:#22c55e;} .bad{color:#ef4444;}</style>";
echo "<h2>PakMunshi Final Fix — Sami Khan SQ Tech</h2>";

$pluginDir = __DIR__ . '/wp-content/plugins/pak-munshi-pro/';

// Step 1: Delete ALL files inside pak-munshi-pro (including backslash-named ones)
echo "<h3>Step 1: Clearing pak-munshi-pro folder</h3><ul>";
if (is_dir($pluginDir)) {
    $items = scandir($pluginDir);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $fullPath = $pluginDir . $item;
        if (is_file($fullPath)) {
            unlink($fullPath);
            echo "<li class='ok'>✅ Deleted: " . htmlspecialchars($item) . "</li>";
        } elseif (is_dir($fullPath)) {
            // Recursively delete subdirs
            $subItems = scandir($fullPath);
            foreach ($subItems as $sub) {
                if ($sub !== '.' && $sub !== '..') {
                    @unlink($fullPath . '/' . $sub);
                }
            }
            @rmdir($fullPath);
            echo "<li class='ok'>✅ Deleted dir: " . htmlspecialchars($item) . "</li>";
        }
    }
    echo "<li class='ok'>✅ Folder cleared!</li>";
} else {
    mkdir($pluginDir, 0755, true);
    echo "<li class='ok'>✅ Folder created fresh!</li>";
}
echo "</ul>";

// Step 2: Write the correct plugin file directly
echo "<h3>Step 2: Writing pak-munshi.php</h3>";

$pluginContent = '<?php
/**
 * Plugin Name:       Pak-Munshi Pro
 * Plugin URI:        https://pakmunshi.com
 * Description:       Hierarchical Role-Based Multi-Tenant SaaS core system for PakMunshi Pro.
 * Version:           1.0.0
 * Author:            Sami Khan - SQ Tech
 * Author URI:        #
 * Text Domain:       pak-munshi-saas
 * License:           GPL v2 or later
 *
 * Designed and Developed by Sami Khan - SQ Tech
 */

if ( ! defined( \'ABSPATH\' ) ) {
    exit;
}

if ( ! defined( \'PAKMUNSHI_SAAS_VERSION\' ) ) {
    define( \'PAKMUNSHI_SAAS_VERSION\', \'1.0.0\' );
}
if ( ! defined( \'PAKMUNSHI_BRANDING\' ) ) {
    define( \'PAKMUNSHI_BRANDING\', \'Designed and Developed by Sami Khan - SQ Tech\' );
}
if ( ! defined( \'PAKMUNSHI_DASHBOARD_SLUG\' ) ) {
    define( \'PAKMUNSHI_DASHBOARD_SLUG\', \'dashboard\' );
}

register_activation_hook( __FILE__, \'pakmunshi_saas_activate\' );
function pakmunshi_saas_activate() {
    pakmunshi_saas_create_tables();
    flush_rewrite_rules();
}

register_deactivation_hook( __FILE__, \'pakmunshi_saas_deactivate\' );
function pakmunshi_saas_deactivate() {
    flush_rewrite_rules();
}

function pakmunshi_saas_create_tables() {
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();
    require_once ABSPATH . \'wp-admin/includes/upgrade.php\';
    $p = $wpdb->prefix;

    dbDelta("CREATE TABLE {$p}pakmunshi_tenants (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        tenant_uuid varchar(64) NOT NULL,
        company_name varchar(200) NOT NULL,
        slug varchar(100) NOT NULL,
        status varchar(50) NOT NULL DEFAULT \'active\',
        subscription_plan varchar(50) NOT NULL DEFAULT \'free\',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id), UNIQUE KEY tenant_uuid (tenant_uuid), UNIQUE KEY slug (slug)
    ) $charset_collate;");

    dbDelta("CREATE TABLE {$p}pakmunshi_properties (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        tenant_id bigint(20) unsigned NOT NULL,
        name varchar(200) NOT NULL,
        address text NOT NULL,
        type varchar(50) NOT NULL DEFAULT \'Residential\',
        status varchar(20) NOT NULL DEFAULT \'Active\',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id), KEY tenant_id (tenant_id)
    ) $charset_collate;");

    dbDelta("CREATE TABLE {$p}pakmunshi_units (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        tenant_id bigint(20) unsigned NOT NULL,
        property_id bigint(20) unsigned NOT NULL,
        unit_number varchar(50) NOT NULL,
        floor int(4) NOT NULL DEFAULT 0,
        unit_type varchar(50) NOT NULL DEFAULT \'Flat\',
        rent_amount decimal(12,2) NOT NULL DEFAULT 0.00,
        status varchar(20) NOT NULL DEFAULT \'Vacant\',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id), KEY tenant_id (tenant_id)
    ) $charset_collate;");

    dbDelta("CREATE TABLE {$p}pakmunshi_rental_tenants (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        tenant_id bigint(20) unsigned NOT NULL,
        unit_id bigint(20) unsigned NOT NULL,
        full_name varchar(200) NOT NULL,
        phone varchar(20) NOT NULL,
        cnic varchar(20) DEFAULT NULL,
        security_deposit decimal(12,2) NOT NULL DEFAULT 0.00,
        agreement_start date NOT NULL,
        status varchar(20) NOT NULL DEFAULT \'Active\',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id), KEY tenant_id (tenant_id)
    ) $charset_collate;");

    dbDelta("CREATE TABLE {$p}pakmunshi_invoices (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        tenant_id bigint(20) unsigned NOT NULL,
        rental_tenant_id bigint(20) unsigned NOT NULL,
        invoice_number varchar(50) NOT NULL,
        billing_month varchar(7) NOT NULL,
        due_date date NOT NULL,
        total_amount decimal(12,2) NOT NULL DEFAULT 0.00,
        paid_amount decimal(12,2) NOT NULL DEFAULT 0.00,
        status varchar(20) NOT NULL DEFAULT \'Unpaid\',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id), UNIQUE KEY invoice_number (invoice_number)
    ) $charset_collate;");

    update_option(\'pakmunshi_saas_db_version\', PAKMUNSHI_SAAS_VERSION);
}

add_action(\'admin_init\', function() {
    if (!current_user_can(\'manage_options\')) return;
    $dir = WP_PLUGIN_DIR;
    foreach (scandir($dir) as $item) {
        if ($item === \'.\' || $item === \'..\' || $item === \'pak-munshi-pro\') continue;
        $lower = strtolower($item);
        if ($lower === \'pakmunshi\' || strpos($lower, \'pak-munshi-pro-\') === 0) {
            $path = $dir . \'/\' . $item;
            if (is_dir($path)) {
                foreach (scandir($path) as $f) {
                    if ($f !== \'.\' && $f !== \'..\') @unlink($path . \'/\' . $f);
                }
                @rmdir($path);
            }
        }
    }
});
';

$result = file_put_contents($pluginDir . 'pak-munshi.php', $pluginContent);

if ($result !== false) {
    echo "<p class='ok'>✅ pak-munshi.php written successfully! (" . $result . " bytes)</p>";
} else {
    echo "<p class='bad'>❌ Could not write file. Check permissions.</p>";
}

// Step 3: Verify
echo "<h3>Step 3: Verification</h3><ul>";
$files = scandir($pluginDir);
foreach ($files as $f) {
    if ($f === '.' || $f === '..') continue;
    echo "<li class='ok'>📄 " . htmlspecialchars($f) . " (" . filesize($pluginDir . $f) . " bytes)</li>";
}
echo "</ul>";

echo "<hr>";
echo "<p class='ok'><strong>✅ DONE! Now activate the plugin.</strong></p>";
echo "<p><a style='color:#2563eb;font-size:1.2em' href='/wp/wp-admin/plugins.php'>→ Go to WordPress Plugins</a></p>";
echo "<p class='bad'>⚠️ DELETE this file after use: pakmunshi-cleanup.php</p>";
?>
