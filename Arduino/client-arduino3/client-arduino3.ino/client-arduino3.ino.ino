#include <ArduinoJson.h>

#define USE_DHCP 1 // Comment to force static IP
//#define DEBUG 1     // Comment to disable Serial
//#define DEBUG_MSG 1     // Comment to disable Received message print

//
//
//
byte nodeNumber = 25;
//
// 
//

byte mac[]    = {  0x0E, 0x00, 0x00, 0x00, 0x00, nodeNumber };
char nodeName[8];

//byte mac[]    = {  0xDE, 0xED, 0xBA, 0xFE, 0xFE, 0xED };
//char  nodeName[] = "Hnode-";  // a reply string to send back

const int MTUu = 1472;  // Usable MTU (1500 - 20 IP - 8 UDP)
byte incomingPacket[MTUu];  // buffer for incoming packets

const int INFO_TIME = 300;
unsigned long lastUpdate = 0;
int infoTime = 0;   // measure info sending latency

unsigned long now = 0;
int workTime = 10;  // measure data receiving and processing latency
int dataRate = 10;  // measure data rate
unsigned long lastData = 0;


void setup()
{
  // NAME
  sprintf(nodeName, "%s%02i","Hnode-", nodeNumber);
  
  // SERIAL
  #if defined(DEBUG)
    Serial.begin(115200);
    delay(100);
    Serial.println("\nHello!");
  #endif

  // LEDS
  leds_init();
  leds_checker();
  leds_show();

  // ETHERNET
  eth_start();
}


void loop()
{

  now = millis();

  // Check if DATA received
  if ( eth_read(incomingPacket, MTUu) ) {

    // UPDATE LEDs with data received
    leds_set( incomingPacket );
    leds_show();
  
    // RECORD time  
    workTime = millis() - now;
    dataRate = millis() - lastData;
    lastData = millis();
  }

  now = millis();
  
  if (millis()-lastUpdate > INFO_TIME) {
    // make info

    StaticJsonBuffer<200> jsonBuffer;
    JsonObject& root = jsonBuffer.createObject();
    root["name"] = nodeName;
    root["processing"] = workTime + infoTime;
    root["dataRate"] = dataRate;
    root["port"] = eth_port();
    char message[200];
    root.printTo(message, sizeof(message));

    // send INFO
    eth_send( message );
    lastUpdate = millis();

    #if defined(DEBUG_MSG)
      Serial.printf("INFO packet sent: %s\n", message);
    #endif

    infoTime = millis() - now;
  }

}
