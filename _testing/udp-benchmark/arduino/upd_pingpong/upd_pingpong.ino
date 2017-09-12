#include <ESP8266WiFi.h>
#include <WiFiUdp.h>

const char* ssid = "101WIFI";
const char* password = "101internet";

WiFiUDP Udp;
unsigned int udpPort = 3737;  // local port to listen on
const int MTUu = 1472;  // Usable MTU (1500 - 20 IP - 8 UDP)
char incomingPacket[MTUu];  // buffer for incoming packets
char  replyPacket[] = "Hi there! Got the message :-)";  // a reply string to send back


void setup()
{
  // Serial.begin(115200);
  // Serial.println();

  // Serial.printf("Connecting to %s ", ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    // Serial.print(".");
  }
  // Serial.println(" connected");

  Udp.begin(udpPort);
  // Serial.printf("Now listening at IP %s, UDP port %d\n", WiFi.localIP().toString().c_str(), udpPort);
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
