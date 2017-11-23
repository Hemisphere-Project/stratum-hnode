#include <ESP8266WiFi.h>
#include <WiFiUdp.h>

WiFiUDP WUdp;

bool wifi_init() {
 // Enable wifi and connect
 WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  if (WiFi.waitForConnectResult() != WL_CONNECTED) {
    if (useWIFI) ESP.restart();
    return false;
  }
  return true;
  //while (WiFi.waitForConnectResult() != WL_CONNECTED) {
    //Serial.println("Connection Failed! Rebooting...");
    //ESP.restart();
  //}
}

void wifi_start() {
  // UDP Receiver
  WUdp.begin(udpPort_node);
  #if defined(DEBUG)
    Serial.printf("Now listening at IP %s, UDP port %d\n", WiFi.localIP().toString().c_str(), udpPort_node);
  #endif
}


bool wifi_read(unsigned char* incomingPacket) {
  int packetSize = WUdp.parsePacket();
  if (packetSize)
  {
    #if defined(DEBUG_MSG)
       Serial.printf("Received %d bytes from %s\n", packetSize, Udp.remoteIP().toString().c_str());
    #endif

    // receive incoming UDP packets
    int len = WUdp.read(incomingPacket, MTUu);
    
    return true;
  }
  return false;
}

void wifi_send(char message[600]) {
  WUdp.beginPacket(server, udpPort_server);
  WUdp.write(message);
  WUdp.endPacket();
}

unsigned int wifi_port() {
  return udpPort_node;
}


