<?php

    /**
     * Plugin Name: Visualization
     * Version: 1.0.0
     * Author: Christina Aiello
     * Author URI: https://github.com/cjaiello/
     * License: GPL3
     */

     /*
     * Notes for debugging:
     * Open this file in vim (or some other editor) and change DEBUG to true:
     * vim /local/websites/dev2-www.cortera.com/htdocs/wp-config.php
     * I have a statement in there right now that will drop all logging info
     * into a file. Open that file to see the logging. - Christina
     */

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
            add_action( 'wp_ajax_nopriv_get_state_data', array( $this, 'get_states' ) );
            add_action( 'wp_ajax_nopriv_get_industry_data', array( $this, 'get_industries' ) );
            add_filter( 'the_content', array( $this, 'display_visualization') );
        }  
        
        /*
        * Will only show the visualization on the post named "test." 
        * add_filter( 'the_content' is run on every page and post, and then I'm either
        * a) returning the content plus the visualization, if the post has the desired name,
        * or b) returning the content untouched.
        * 
        * If you want to switch to show this on a page instead of a post, you'll need to use the $page
        * global variable and the page int instead of page name. See more here:
        * https://codex.wordpress.org/Global_Variables
        */
        function display_visualization ($content) {
            global $post;
            
            // Replace 'test' with the name of the post you want the visualization to show on.
            // Right now this plops the visualization at the end of the post content.
            // If you want it to show somewhere else, instead of $content .= ' you'll want to 
            // drop a <div> into the post with a specific classname and append this to the classname.

            // add back in if we want tooltip: </div>
            if ( $post->post_name == 'test' ) {
                $content .= '<div class="outer-container"><div class="visualization"></div><div class="inner-container"><div class="dropdown"></div><div class="naics-dropdown"></div></div><div id="tooltip-container"></div></div>';
            }
            return $content;
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
            wp_localize_script( 'get-states-script', 'getNAICS_ajax', array( 'ajax_url' => admin_url('admin-ajax.php'))); 
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
        * There isn't actual input to the function, but you can hit 
        * $_POST[KEY OF VALUE PASSED OVER HERE] in the function to get info from the POST
        */
        public function get_states() {
            $selectedDropDownValue = $_POST['selectedDropDownValue'];
            $selectedNaicsValue = $_POST['selectedNaicsValue'];

            // Table names
            $CORONA_COUNTY_WEEKLY = "CORONA_COUNTY_WEEKLY";
            $CORONA_UNEMPLOYMENT_ALL = "CORONA_UNEMPLOYMENT_ALL";
            $CORONA_NAICS3_WEEKLY = "CORONA_NAICS3_WEEKLY";
            $CORONA_NAICS2_WEEKLY = "CORONA_NAICS2_WEEKLY";
            $isNaics2 = $selectedNaicsValue < 100 && $selectedNaicsValue > 0;

            // Lets us hit the WordPress database
            global $wpdb;

            if ($selectedDropDownValue === "INITIAL_CLAIMS" || $selectedDropDownValue === "INSURED_UNEMPLOYMENT_RATE") {

                // These two don't have NAICS-specific info
                $result = $wpdb->get_results('SELECT STATE, AVG(' . $selectedDropDownValue . ') AS STATE_AVG FROM ' . $CORONA_UNEMPLOYMENT_ALL . ' GROUP BY STATE ORDER BY STATE');
            
            } else if ($selectedNaicsValue == null || $selectedNaicsValue == 0) {
                // 0 is a dummy value for the NAICS placeholder text

                // Map telling us which table contains which column of data
                $dropDownValuesToTableNames = [
                    "AVG_CURRENT_AR" => $CORONA_COUNTY_WEEKLY,
                    "AVG_CURRENT_AR_DELTA_MO" => $CORONA_COUNTY_WEEKLY,
                    "AVG_CURRENT_AR_DELTA_WK" => $CORONA_COUNTY_WEEKLY,
                    "AVG_DBT" => $CORONA_COUNTY_WEEKLY,
                    "AVG_CPR" => $CORONA_COUNTY_WEEKLY,
                    "AVG_PCT_LATE" => $CORONA_COUNTY_WEEKLY
                ];

                // Getting the correct table to pull the data from
                $tableContainingSelectedDropDownValue = $dropDownValuesToTableNames[$selectedDropDownValue];

                $result = $wpdb->get_results('SELECT STATE, AVG(' . $selectedDropDownValue . ') AS STATE_AVG FROM ' . $tableContainingSelectedDropDownValue . ' GROUP BY STATE ORDER BY STATE');

            } else if ($isNaics2) {

                // Map telling us which table contains which column of data
                $dropDownValuesToTableNames = [
                    "AVG_CURRENT_AR" => $CORONA_NAICS2_WEEKLY,
                    "AVG_CURRENT_AR_DELTA_MO" => $CORONA_NAICS2_WEEKLY,
                    "AVG_CURRENT_AR_DELTA_WK" => $CORONA_NAICS2_WEEKLY,
                    "AVG_DBT" => $CORONA_NAICS2_WEEKLY,
                    "AVG_CPR" => $CORONA_NAICS2_WEEKLY,
                    "AVG_PCT_LATE" => $CORONA_NAICS2_WEEKLY
                ];
                // Getting the correct table to pull the data from
                $tableContainingSelectedDropDownValue = $dropDownValuesToTableNames[$selectedDropDownValue];

                $result = $wpdb->get_results('SELECT STATE, AVG(' . $selectedDropDownValue . ') AS STATE_AVG FROM ' . $tableContainingSelectedDropDownValue . ' WHERE NAICS2 = ' . $selectedNaicsValue . ' GROUP BY STATE ORDER BY STATE');
            
            } else {
                
                // Map telling us which table contains which column of data
                $dropDownValuesToTableNames = [
                    "AVG_CURRENT_AR" => $CORONA_NAICS3_WEEKLY,
                    "AVG_CURRENT_AR_DELTA_MO" => $CORONA_NAICS3_WEEKLY,
                    "AVG_CURRENT_AR_DELTA_WK" => $CORONA_NAICS3_WEEKLY,
                    "AVG_DBT" => $CORONA_NAICS3_WEEKLY,
                    "AVG_CPR" => $CORONA_NAICS3_WEEKLY,
                    "AVG_PCT_LATE" => $CORONA_NAICS3_WEEKLY
                ];
    
                // Getting the correct table to pull the data from
                $tableContainingSelectedDropDownValue = $dropDownValuesToTableNames[$selectedDropDownValue];

                $result = $wpdb->get_results('SELECT STATE, AVG(' . $selectedDropDownValue . ') AS STATE_AVG FROM ' . $tableContainingSelectedDropDownValue . ' WHERE NAICS3 = ' . $selectedNaicsValue . ' GROUP BY STATE ORDER BY STATE');
           
            }
            
            // You echo instead of returning (Isn't WordPress & PHP fun?)
            echo json_encode($result);
        }

        /*
        * Hit via AJAX call from JavaScript.
        */
        public function get_industries() {
            global $wpdb;
            $result = $wpdb->get_results('SELECT * FROM NAICS_DESC');
            
            echo json_encode($result);
        }
    }

