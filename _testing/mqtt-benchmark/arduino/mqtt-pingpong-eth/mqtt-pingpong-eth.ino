#include <SPI.h>
#include <Ethernet2.h>
#include <PubSubClient.h>

//#define USE_DHCP 1
#define DEBUG 1     // Comment to disable Serial
//#define DEBUG_MSG 1     // Comment to disable Serial
#define WIZ_RESET 2
#define WIZ_CS 15

byte mac[]    = {  0xDE, 0xED, 0xBA, 0xFE, 0xFE, 0xED };
IPAddress ip(192, 168, 0, 29);       // fallback IP address (if no DHCP available)
IPAddress server(192, 168, 0, 32);    // MQTT Broker (server)


EthernetClient ethClient;
PubSubClient client(ethClient);

long lastReconnectAttempt = 0;
long lastMsg = 0;
char msg[1400];
int value = 0;

void callback(char* topic, byte* payload, unsigned int length) {
  #if defined(DEBUG)
    #if defined(DEBUG_MSG)
      Serial.print("Message arrived [");
      Serial.print(topic);
      Serial.print("] ");
      for (int i = 0; i < length; i++) {
        Serial.print((char)payload[i]);
      }
      Serial.println();
    #endif
  #endif
  
  client.publish("pong", "!");
}

boolean reconnect() {

  long now = millis();
  if (now - lastReconnectAttempt > 1000) {
    lastReconnectAttempt = now;
    
    if (client.connect("HNode")) {
      #if defined(DEBUG)
        Serial.println("MQTT Broker connected");
      #endif
      client.subscribe("ping", 0);
      delay(1000);
      client.publish("pong", "hello");
    }
    if (client.connected()) lastReconnectAttempt = 0;
  }
  
  return client.connected();
}

void setup() {

  // INIT
  //pinMode(BUILTIN_LED, OUTPUT);     // Initialize the BUILTIN_LED pin as an output
  lastReconnectAttempt = 0;
  
  // SERIAL
  #if defined(DEBUG)
    Serial.begin(115200);
    delay(100);
    Serial.println("\nHello!");
  #endif

  // MQTT setup
  client.setServer(server, 3737);
  client.setCallback(callback);

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
  #if defined(USE_DHCP)
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
  
}

void loop() {

  // ETH poll & reconnect
  if (client.connected()) client.loop();
  else reconnect();

 
}
