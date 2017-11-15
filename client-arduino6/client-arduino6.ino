#include <ArduinoJson.h>
#include <Ethernet2.h>

//#define DEBUG 1     // Comment to disable Serial
//#define DEBUG_MSG 1     // Comment to disable Received message print
//#define USE_DHCP 1 // Comment to force static IP

//
//
//
const int VERSION = 6;
byte nodeNumber = 25;                                             // todo: replace with ESP.getChipId() ??

byte mac[]    = {  0x0E, 0x00, 0x00, 0x00, 0x00, nodeNumber };    // todo: replace with ESP.getChipId() - (last 3 bytes) ??
IPAddress ip(192, 168, 0, nodeNumber+10);                            // Static IP

const char* ssid = "stratum";
const char* password = "9000leds";
const bool useWIFI = true;

//
// 
//

unsigned int udpPort_node = 3738;  // local port to listen on
unsigned int udpPort_server = 3737;  // local port to speak to
IPAddress server(192, 168, 6, 3);
char nodeName[8];

const int MTUu = 1472;  // Usable MTU (1500 - 20 IP - 8 U,DP)
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
  bool net_read;
  if (useWIFI) net_read =  wifi_read(incomingPacket);
  else  net_read =  eth_read(incomingPacket);
  
  if ( net_read ) {

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
