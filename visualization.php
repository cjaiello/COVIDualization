<?php

    /**
     * Plugin Name: Visualization
     * Version: 1.0.0
     * Author: Christina Aiello
     * Author URI: https://github.com/cjaiello/
     * License: GPL3
     */

    require(plugin_dir_path( __FILE__ ).'widget.php');

    $readMeLater = new Visualization();
    $readMeLater->run();

    class Visualization {
        /*
        * Action hooks
        */
        public function run() {     
            // Enqueue plugin styles and scripts
            add_action( 'plugins_loaded', array( $this, 'register_rml' ) );
            add_action( 'plugins_loaded', array( $this, 'enqueue_rml_scripts' ) );
            add_action( 'plugins_loaded', array( $this, 'enqueue_rml_styles' ) );
            add_action( 'wp_ajax_get_state_data', array( $this, 'get_states' ) );
            add_filter( 'the_content', array( $this, 'display_visualization') );
        }  
        
        /*
        * Will only show the visualization on the post named "test"
        */
        function display_visualization ($content) {
            global $post;
            if ( $post->post_name == 'test' ) {
                // Do something to $content
                $content .= '<div class="visualization"></div>';
            }
            return $content .= '<div class="visualization"></div>';
        }

        /**
        * Register plugin styles and scripts
        */
        public function register_rml() {
            wp_register_script( 'd3', 'https://d3js.org/d3.v3.min.js', array('jquery'), null, true );
            wp_register_script( 'queue', 'https://d3js.org/queue.v1.min.js', array('jquery'), null, true );
            wp_register_script( 'topojson', 'https://d3js.org/topojson.v1.min.js', array('jquery'), null, true );
            wp_register_script('get-states-script', plugins_url( 'js/visualization.js', __FILE__ ), array('jquery'));
            wp_register_style( 'rml-style', plugins_url( 'css/visualization.css', __FILE__  ) );
        }  

        /**
        * Enqueues plugin-specific scripts.
        */
        public function enqueue_rml_scripts() {
            wp_enqueue_script( 'queue', 'https://d3js.org/queue.v1.min.js', array('jquery'), null, true );
            wp_enqueue_script( 'topojson', 'https://d3js.org/topojson.v1.min.js', array('jquery'), null, true );
            wp_enqueue_script('get-states-script', plugins_url( 'js/visualization.js', __FILE__ ), array('jquery'));
            wp_localize_script( 'get-states-script', 'getstates_ajax', array( 'ajax_url' => admin_url('admin-ajax.php'))); 
        } 

        /**
        * Enqueues plugin-specific styles.
        */
        public function enqueue_rml_styles() {         
            wp_enqueue_style( 'rml-style' ); 
        }

        /*
        * Hit via AJAX call from JavaScript.
        * Gets state data from database, based on what was selected in the dropdown.
        */
        public function get_states() {
            global $wpdb;
            
            $selectedDropDownValue = $_POST['selected'];
            $CORONA_COUNTY_WEEKLY = "CORONA_COUNTY_WEEKLY";
            $CORONA_UNEMPLOYMENT_ALL = "CORONA_UNEMPLOYMENT_ALL";
            $dropDownValuesToTableNames = [
                "AVG_CURRENT_AR" => CORONA_COUNTY_WEEKLY,
                "AVG_CURRENT_AR_DELTA_MO" => CORONA_COUNTY_WEEKLY,
                "AVG_DBT" => CORONA_COUNTY_WEEKLY,
                "AVG_CPR" => CORONA_COUNTY_WEEKLY,
                "AVG_PCT_LATE" => CORONA_COUNTY_WEEKLY,
                "INITIAL_CLAIMS" => CORONA_UNEMPLOYMENT_ALL,
                "INSURED_UNEMPLOYMENT_RATE" => CORONA_UNEMPLOYMENT_ALL
            ];
            $tableContainingSelectedDropDownValue = $dropDownValuesToTableNames[$selectedDropDownValue];
            $result = $wpdb->get_results('SELECT STATE, AVG(' . $selectedDropDownValue . ') AS STATE_AVG FROM ' . $tableContainingSelectedDropDownValue . ' GROUP BY STATE ORDER BY STATE_AVG DESC');
            return json_encode($result);
        }
    }

