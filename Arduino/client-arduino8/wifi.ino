#include <ESP8266WiFi.h>
#include <WiFiUdp.h>

WiFiUDP WUdp;

byte WIFIstate = 0;   // 0 = stopped, 1 = connecting, 2 = connected

bool wifi_init() {

  WIFIstate = 1;
  
  // Enable wifi and connect
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(ssid, password);

  // If WIFI is the main channel, wait for connection to succeed or restart
  if (useWIFI) {
    if (WiFi.waitForConnectResult() != WL_CONNECTED)  ESP.restart();
    else return true;
  }

  return false;
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

bool wifi_check() {
  if (WIFIstate == 0) return false;
  if (WIFIstate == 2) return true;

  if (WiFi.status() == WL_CONNECTED) {
    WIFIstate = 2;
    return true;
  }
  else if (millis() > 30000) wifi_stop();
  
  return false;
}

void wifi_stop() {
  #ifdef DEBUG
    Serial.println("Stopping wifi...");
  #endif
  WiFi.forceSleepBegin();
  WIFIstate = 0;
}


