#include <Ethernet2.h>

//#define DEBUG 1     // Comment to disable Serial
//#define DEBUG_MSG 1     // Comment to disable Received message print
//#define USE_DHCP_ETH 1 // Comment to force static IP

//
// REPLACE NODE ID (comment once it has been done !)
// STRATUM: 1 -> 30
// RYTHMUS: 101 -> 113
//
#define NODE_NUMBER 113


//
// VERSION 
//
const int VERSION = 7;
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
IPAddress server(192, 168, 0, 255);
unsigned int udpPort_node = 3738;  // Node port to listen on
unsigned int udpPort_server = 3737;  // Server port to speak to

char nodeName[30];

const int MTUu = 1472;  // Usable MTU (1500 - 20 IP - 8 UDP)
unsigned char incomingPacket[MTUu];  // buffer for incoming packets

const int INFO_TIME = 500;
unsigned long lastUpdate = 0;

void setup()
{
  // NODE ID
  #ifdef NODE_NUMBER
    eeprom_setID((byte)NODE_NUMBER);
  #endif
  
  // NAME
  sprintf(nodeName, "Hnode-%02i//%i//%i", eeprom_getID(), udpPort_node, VERSION);
  
  // SERIAL
  #ifdef DEBUG
    Serial.begin(115200);
    delay(100);
    Serial.println("\nHello!\n");
    Serial.println(nodeName);
  #endif

  // LEDS
  leds_init();
  leds_blackout();
  leds_show();

  // WIFI CONNECT
  wifi_init();

  // UDP SOCKET START
  if (useWIFI) wifi_start();
  else eth_start();
   
}


void loop()
{
  // OTA
  if (wifi_check()) {
    ota_loop();
    yield();
  }

  // Check if DATA received
  bool new_data;
  if (useWIFI) new_data =  wifi_read(incomingPacket);
  else  new_data =  eth_read(incomingPacket);
  yield();

  // New DATA received: set LEDS
  if ( new_data ) {
    // UPDATE LEDs with data received
    leds_set( incomingPacket );
    leds_show();
  }

  // Inform + HeartBeat
  if (millis()-lastUpdate > INFO_TIME) {

    // send INFO
    if (useWIFI) wifi_send( nodeName );
    else eth_send( nodeName );
    
    lastUpdate = millis();

    #if defined(DEBUG_MSG)
      Serial.printf("INFO packet sent: %s\n", message);
    #endif
  }
  yield();
}
