#include <SPI.h>         // needed for Arduino versions later than 0018
#include <Ethernet2.h>
#include <EthernetUdp2.h>         // UDP library from: bjoern@cs.stanford.edu 12/30/2008

#define DEBUG 1     // Comment to disable Serial
#define WIZ_RESET 2
#define WIZ_CS 15

byte mac[]    = {  0xDE, 0xED, 0xBA, 0xFE, 0xFE, 0xED };
IPAddress ip(192, 168, 0, 177);       // fallback IP address (if no DHCP available)


EthernetUDP Udp;
unsigned int udpPort = 3737;  // local port to listen on
const int MTUu = 1472;  // Usable MTU (1500 - 20 IP - 8 UDP)
char incomingPacket[MTUu];  // buffer for incoming packets
char  replyPacket[] = "Hi there! Got the message :-)";  // a reply string to send back


void setup()
{
  // SERIAL
  #if defined(DEBUG)
    Serial.begin(115200);
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

 

  Udp.begin(udpPort);
  #if defined(DEBUG)
    Serial.printf("Now listening at IP %s, UDP port %d\n", Ethernet.localIP().toString().c_str(), udpPort);
  #endif
}


void loop()
{
  int packetSize = Udp.parsePacket();
  if (packetSize)
  {
    // receive incoming UDP packets
    // Serial.printf("Received %d bytes from %s\n", packetSize, Udp.remoteIP().toString().c_str());
    int len = Udp.read(incomingPacket, MTUu);
    if (len > 0)
    {
      incomingPacket[len] = 0;
    }
    // Serial.printf("UDP packet contents: %s\n", incomingPacket);

    // send back a reply, to the IP address and port we got the packet from
    Udp.beginPacket(Udp.remoteIP(), udpPort);
    Udp.write(replyPacket);
    Udp.endPacket();
  }
}
