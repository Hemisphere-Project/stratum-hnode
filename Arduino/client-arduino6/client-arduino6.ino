#include <ArduinoJson.h>
#include <Ethernet2.h>

//#define DEBUG 1     // Comment to disable Serial
//#define DEBUG_MSG 1     // Comment to disable Received message print
//#define USE_DHCP_ETH 1 // Comment to force static IP

//
// REPLACE NODE ID (comment once it has been done !)
//
#define NODE_NUMBER 25


//
// VERSION 
//
const int VERSION = 6;
/*
 * VERSION 6:
 * Push Node Number into EEPROM to avoid reflashing Number each time !
 * Also Wifi connection is not blocking when using ETH as main pipeline
 * 
 */

//
// WIFI
//
const char* ssid = "stratum";
const char* password = "9000leds";
const bool useWIFI = false;

//
// NETWORK 
//
IPAddress server(192, 168, 0, 99);
unsigned int udpPort_node = 3738;  // Node port to listen on
unsigned int udpPort_server = 3737;  // Server port to speak to

byte nodeID;
char nodeName[8];

const int MTUu = 1472;  // Usable MTU (1500 - 20 IP - 8 UDP)
unsigned char incomingPacket[MTUu];  // buffer for incoming packets

const int INFO_TIME = 500;
unsigned long lastUpdate = 0;
int infoTime = 0;   // measure info sending latency

unsigned long now = 0;
int workTime = 10;  // measure data receiving and processing latency
int dataRate = 10;  // measure data rate
unsigned long lastData = 0;


void setup()
{
  // NODE ID
  #ifdef NODE_NUMBER
    eeprom_setID((byte)NODE_NUMBER);
  #endif
  nodeID = eeprom_getID();
  
  // NAME
  sprintf(nodeName, "%s%02i","Hnode-", nodeID);
  
  // SERIAL
  #ifdef DEBUG
    Serial.begin(115200);
    delay(100);
    Serial.println("\nHello!\n");
    Serial.println("Node: "+nodeName);
  #endif

  // LEDS
  leds_init();
  leds_checker(1);
  leds_show();

  // WIFI CONNECT
  bool ok = wifi_init();
  if (ok) leds_checker(2);
  else leds_checker(3);
  leds_show();

  // NETWORK START
  if (useWIFI) wifi_start();
  else eth_start();
  
  //OTA
  ota_setup();

  
}


void loop()
{
  now = millis();
  
  // OTA
  ota_loop();

  // Check if DATA received
  bool new_data;
  if (useWIFI) new_data =  wifi_read(incomingPacket);
  else  new_data =  eth_read(incomingPacket);
  
  if ( new_data ) {

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

    StaticJsonBuffer<600> jsonBuffer;
    JsonObject& root = jsonBuffer.createObject();
    root["name"] = nodeName;
    root["processing"] = workTime + infoTime;
    root["dataRate"] = dataRate;
    root["port"] = wifi_port();
    root["version"] = VERSION;
    char message[600];
    root.printTo(message, sizeof(message));

    // send INFO
    if (useWIFI) wifi_send( message );
    else eth_send( message );

    
    lastUpdate = millis();

    #if defined(DEBUG_MSG)
      Serial.printf("INFO packet sent: %s\n", message);
    #endif

    infoTime = millis() - now;
  }

}
