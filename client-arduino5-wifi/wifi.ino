#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h> // OTA
#include <WiFiUdp.h>
#include <ArduinoOTA.h> // OTA

IPAddress server(192, 168, 0, 200);

WiFiUDP Udp;
unsigned int udpPort_node = 3738;  // local port to listen on
unsigned int udpPort_server = 3737;  // local port to speak to

void wifi_start() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.waitForConnectResult() != WL_CONNECTED) {
    //Serial.println("Connection Failed! Rebooting...");
    delay(3000);
    ESP.restart();
  }

  // Port defaults to 8266
  // ArduinoOTA.setPort(8266);

  // Hostname defaults to esp8266-[ChipID]
  ArduinoOTA.setHostname(nodeName);

  // No authentication by default
  // ArduinoOTA.setPassword((const char *)"123");

  ArduinoOTA.onStart([]() {
    Serial.println("Start");
  });
  ArduinoOTA.onEnd([]() {
    Serial.println("\nEnd");
  });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
    else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
    else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
    else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
    else if (error == OTA_END_ERROR) Serial.println("End Failed");
  });
  ArduinoOTA.begin();
  
  // UDP Receiver
  Udp.begin(udpPort_node);
  #if defined(DEBUG)
    Serial.printf("Now listening at IP %s, UDP port %d\n", WiFi.localIP().toString().c_str(), udpPort_node);
  #endif
}

bool wifi_loop() {
  ArduinoOTA.handle();
}

bool wifi_read(unsigned char* incomingPacket) {
  int packetSize = Udp.parsePacket();
  if (packetSize)
  {
    #if defined(DEBUG_MSG)
       Serial.printf("Received %d bytes from %s\n", packetSize, Udp.remoteIP().toString().c_str());
    #endif

    // receive incoming UDP packets
    int len = Udp.read(incomingPacket, MTUu);
    
    return true;
  }
  return false;
}

void wifi_send(char message[600]) {
  Udp.beginPacket(server, udpPort_server);
  Udp.write(message);
  Udp.endPacket();
}

unsigned int wifi_port() {
  return udpPort_node;
}


