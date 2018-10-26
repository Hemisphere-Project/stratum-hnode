#include <Adafruit_NeoPixel.h>

#define NUM_STRIPS 4

// STRATUM
#define NUM_LEDS_PER_STRIP 90


Adafruit_NeoPixel strip0 = Adafruit_NeoPixel(NUM_LEDS_PER_STRIP, 5, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel strip1 = Adafruit_NeoPixel(NUM_LEDS_PER_STRIP, 4, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel strip2 = Adafruit_NeoPixel(NUM_LEDS_PER_STRIP, 0, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel strip3 = Adafruit_NeoPixel(NUM_LEDS_PER_STRIP, 2, NEO_GRB + NEO_KHZ800);

void leds_init() {
  strip0.begin();
  strip1.begin();
  strip2.begin();
  strip3.begin();
}

void leds_show() {
  strip0.show();
  yield();
  strip1.show();
  yield();
  strip2.show();
  yield();
  strip3.show();
  yield();
}

void led_set(byte s, byte l, byte r, byte g, byte b) {
  if (s == 0) strip0.setPixelColor(l, strip0.Color(r,g,b));
  else if (s == 1) strip1.setPixelColor(l, strip1.Color(r,g,b));
  else if (s == 2) strip2.setPixelColor(l, strip2.Color(r,g,b));
  else if (s == 3) strip3.setPixelColor(l, strip3.Color(r,g,b));
}

void leds_set(unsigned char* payload) {
  for(int x = 0; x < NUM_STRIPS; x++)
      for(int i = 0; i < NUM_LEDS_PER_STRIP; i++) {
        int k = x*NUM_LEDS_PER_STRIP*3+i*3;
        if ((k+2) < MTUu) led_set(x, i, payload[k], payload[k+1], payload[k+2]);
      }
}

void leds_blackout() {
  for(int x = 0; x < NUM_STRIPS; x++)
      for(int i = 0; i < NUM_LEDS_PER_STRIP; i++)
        led_set(x, i, 0, 0, 0);
}

void leds_checker(byte modes) {
  leds_blackout();
  if (modes == 0) {
    led_set(0, 0, 255, 0, 0);
    led_set(0, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(1, 0, 255, 0, 0);
    led_set(1, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(2, 0, 255, 0, 0);
    led_set(2, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(3, 0, 255, 0, 0);
    led_set(3, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
  } 
  else if (modes == 1) {
    led_set(0, 0, 20, 0, 0);
    //led_set(0, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(1, 0, 20, 0, 0);
    //led_set(1, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(2, 0, 20, 0, 0);
    //led_set(2, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(3, 0, 20, 0, 0);
    //led_set(3, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
  } 
  else if (modes == 2) {
    led_set(0, 0, 0, 20, 0);
    //led_set(0, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(1, 0, 0, 20, 0);
    //led_set(1, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(2, 0, 0, 20, 0);
    //led_set(2, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(3, 0, 0, 20, 0);
    //led_set(3, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
  } 
  else if (modes == 3) {
    led_set(0, 0, 20, 20, 0);
    //led_set(0, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(1, 0, 20, 20, 0);
    //led_set(1, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(2, 0, 20, 20, 0);
    //led_set(2, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(3, 0, 20, 20, 0);
    //led_set(3, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
  }
  else if (modes == 4) {
    led_set(0, 0, 20, 20, 20);
    //led_set(0, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(1, 0, 20, 20, 20);
    //led_set(1, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(2, 0, 20, 20, 20);
    //led_set(2, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
    led_set(3, 0, 20, 20, 20);
    //led_set(3, NUM_LEDS_PER_STRIP-1, 255, 0, 0);
  }
}
