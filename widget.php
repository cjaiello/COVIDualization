<?php

    class RML_Widget extends WP_Widget {
        function __construct() {
            parent::__construct(
            'rml_widget', // Base ID
                __( 'Read Me Later', 'text_domain' ), // Name
                array( 'classname' => 'rml_widgt', 'description' => __( 'Read Me Later widget for displaying saved posts', 'text_domain' ), ) // Args
            );
        }

        public function form( $instance ) {
            if ( isset( $instance['title'] ) ) {
                $title = $instance['title'];
            } else {
                $title = __( 'Read Me Later Posts', 'text_domain' );
            }
            ?>
                <p>
                    <label for="<?php echo $this->get_field_id( 'title' ); ?>"><?php _e( 'Title:' ); ?></label>
                    <input class="widefat" id="<?php echo $this->get_field_id( 'title' ); ?>"
                        name="<?php echo $this->get_field_name( 'title' ); ?>" type="text"
                        value="<?php echo esc_attr( $title ); ?>">
                </p>
            <?php
        }

        public function update( $new_instance, $old_instance ) {
            $instance          = array();
            $instance['title'] = ( ! empty( $new_instance['title'] ) ) ? strip_tags( $new_instance['title'] ) : '';

            return $instance;
        }

        public function widget( $args, $instance ) {      
            $title = apply_filters( 'widget_title', $instance['title'] ); 
            echo $args['before_widget'];
            if ( ! empty( $title ) ) {
                echo $args['before_title'] . $title . $args['after_title'];
            }

            echo '<div class="rml_contents">';

                $ids = get_user_meta( wp_get_current_user()->ID, 'rml_post_ids', true );

                $args = array( 
                    'post_type' => 'post',
                    'orderby' => 'DESC', 
                    'posts_per_page' => -1, 
                    'numberposts' => -1,
                    'post__in' => $ids
                );

                $rmlposts = get_posts( $args );
                if( $ids ) :
                    global $post;
                    foreach ( $rmlposts as $post ) :
                        setup_postdata( $post );
                        $img = wp_get_attachment_image_src( get_post_thumbnail_id() ); 
                        ?>          
                        <div class="rml_posts">                 
                            <div class="rml_post_content">
                                <h4><a href="<?php echo get_the_permalink(); ?>"><?php the_title(); ?></a></h4>
                                <p><?php the_excerpt; ?></p>
                            </div>
                            <img src="<?php echo $img[0]; ?>" alt="<?php echo get_the_title(); ?>" class="rml_img">                    
                        </div>
                    <?php 
                    endforeach;
                    wp_reset_postdata();
                else :
                echo '<p>You have no saved posts now.</p>';
                endif;  

            echo '</div>';      
            echo $args['after_widget'];
        }
    }

