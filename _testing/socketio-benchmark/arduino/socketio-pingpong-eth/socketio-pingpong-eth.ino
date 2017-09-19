#include <SPI.h>
#include "SocketIOClient.h"

#define DEBUG 1     // Comment to disable Serial
#define DEBUG_MSG 1     // Comment to disable Serial
#define WIZ_RESET 2
#define WIZ_CS 15

byte mac[]    = {  0xDE, 0xED, 0xBA, 0xFE, 0xFE, 0xED };
IPAddress ip(192, 168, 0, 177);       // fallback IP address (if no DHCP available)
char server[] = "echo.websocket.org";
SocketIOClient client;
String q = "\"";

/*void ondata(SocketIOClient client, char *data) {
  #if defined(DEBUG)
    #if defined(DEBUG_MSG)
      Serial.printf("got ping: %s -- sending back pong\n", data);
    #endif
  #endif
  client.send("Hello, world!\n");
}*/

void setup() {
    // SERIAL
    #if defined(DEBUG)
      Serial.begin(500000);
      delay(100);
      Serial.println("\nHello!");
    #endif


    // RESET ethernet
    #if defined(WIZ_RESET)
      #if defined(DEBUG)
        Serial.print("Reset Ethernet interface... ");
      #endif
      pinMode(WIZ_RESET, OUTPUT);
      digitalWrite(WIZ_RESET, HIGH);
      delay(100);
      digitalWrite(WIZ_RESET, LOW);
      delay(100);
      digitalWrite(WIZ_RESET, HIGH);
      #if defined(DEBUG)
        Serial.println("done");
      #endif
    #endif

    // ETH start
    Ethernet.init(WIZ_CS);
    if (Ethernet.begin(mac) == 0) {
      #if defined(DEBUG)
        Serial.println("DHCP failed... fallback to static");
      #endif
      Ethernet.begin(mac, ip);
    }
    #if defined(DEBUG)
      Serial.print("HNode IP: ");
      Serial.println(Ethernet.localIP());
    #endif
    delay(1000);

   client.connect(server);
   client.setDataArrivedDelegate(dataArrived);
   client.send("Hello World!");
}

void loop() {
  client.monitor();
  if (!client.connected()) client.connect(server);
  delay(1000);
  client.send("Hello World!");
}

void dataArrived(SocketIOClient client, char *data) {
  Serial.println(data);
}
