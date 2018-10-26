#include <SPI.h>         // needed for Arduino versions later than 0018
#include <Ethernet2.h>
#include <EthernetUdp2.h>         // UDP library from: bjoern@cs.stanford.edu 12/30/2008

#define WIZ_RESET 3
#define WIZ_CS 15

EthernetUDP Udp;

void eth_start() {

  IPAddress ip(192, 168, 0, eeprom_getID()+100);                             // Static IP
  byte mac[]    = {  0x0E, 0x00, 0x00, 0x00, 0x00, eeprom_getID() };        // Eth MAC
  
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
  #if defined(USE_DHCP_ETH)
    if (Ethernet.begin(mac) == 0) {
      #if defined(DEBUG)
        Serial.println("DHCP failed... fallback to static");
      #endif
      Ethernet.begin(mac, ip);
    }
  #else
    Ethernet.begin(mac, ip);
  #endif
  #if defined(DEBUG)
    Serial.print("HNode IP: ");
    Serial.println(Ethernet.localIP());
  #endif

  // UDP Receiver
  Udp.begin(udpPort_node);
  #if defined(DEBUG)
    Serial.printf("Now listening at IP %s, UDP port %d\n", Ethernet.localIP().toString().c_str(), udpPort_node);
  #endif
}

bool eth_read(unsigned char* incomingPacket) {
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

void eth_send(char message[30]) {
  Udp.beginPacket(server, udpPort_server);
  Udp.write(message);
  Udp.endPacket();
}

unsigned int eth_port() {
  return udpPort_node;
}


