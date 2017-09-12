#include <Arduino.h>

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>

#include <SocketIoClient.h>

#define USE_SERIAL Serial

ESP8266WiFiMulti WiFiMulti;
SocketIoClient webSocket;
String q = "\"";

void ping(const char * payload, size_t length) {
  //USE_SERIAL.printf("got ping: %s -- sending back pong\n", payload);
  webSocket.emit("pong", "\"ok\"" );
}

void setup() {
    //USE_SERIAL.begin(115200);

    //USE_SERIAL.setDebugOutput(true);

    //USE_SERIAL.println();
    //USE_SERIAL.println();
    //USE_SERIAL.println();

      for(uint8_t t = 4; t > 0; t--) {
          //USE_SERIAL.printf("[SETUP] BOOT WAIT %d...\n", t);
          //USE_SERIAL.flush();
          delay(1000);
      }

    WiFiMulti.addAP("101WIFI", "101internet");

    while(WiFiMulti.run() != WL_CONNECTED) {
        delay(100);
    }

    webSocket.on("ping", ping);
    webSocket.begin("192.168.0.47", 8080);
}

void loop() {
    webSocket.loop();
}
