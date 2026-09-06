<?php
if (!defined('ABSPATH')) exit;
function bennietay_business_assets(){wp_enqueue_style('bennietay-business',get_stylesheet_uri(),[], '1.1.0');wp_enqueue_script('bennietay-business',get_template_directory_uri().'/assets/interactions.js',[], '1.1.0', true);}
add_action('wp_enqueue_scripts','bennietay_business_assets');
add_theme_support('title-tag'); add_theme_support('post-thumbnails'); add_theme_support('custom-logo'); register_nav_menus(['primary'=>'Primary navigation']);

function bennietay_business_install_pages(){
    $pages=[
        'home'=>['Home',''],
        'services'=>['Services','<h2>Services designed around your priorities</h2><p>Describe your core services, who they help and the result customers can expect.</p>'],
        'about'=>['About','<h2>Experience customers can trust</h2><p>Tell customers who you are, how you work and why they can choose you with confidence.</p>'],
        'portfolio'=>['Portfolio','<h2>Reviews and recent work</h2><p>Add customer reviews, case studies, gallery images or projects here.</p>'],
        'contact'=>['Contact','<h2>Start a conversation</h2><p>Tell us what you need and we will reply with a clear next step.</p>[bennietay_lead_form]'],
    ];
    $ids=[];
    foreach($pages as $slug=>$page){
        $existing=get_page_by_path($slug);
        $ids[$slug]=$existing ? $existing->ID : wp_insert_post(['post_title'=>$page[0],'post_name'=>$slug,'post_content'=>$page[1],'post_status'=>'publish','post_type'=>'page']);
    }
    if(!is_wp_error($ids['home'])){update_option('show_on_front','page');update_option('page_on_front',$ids['home']);}
    $menu=wp_get_nav_menu_object('Primary');
    $menu_id=$menu?$menu->term_id:wp_create_nav_menu('Primary');
    if(!is_wp_error($menu_id) && !wp_get_nav_menu_items($menu_id)){
        foreach(['home','services','about','portfolio','contact'] as $slug){wp_update_nav_menu_item($menu_id,0,['menu-item-title'=>$pages[$slug][0],'menu-item-object'=>'page','menu-item-object-id'=>$ids[$slug],'menu-item-type'=>'post_type','menu-item-status'=>'publish']);}
        set_theme_mod('nav_menu_locations',['primary'=>$menu_id]);
    }
}
add_action('after_switch_theme','bennietay_business_install_pages');
