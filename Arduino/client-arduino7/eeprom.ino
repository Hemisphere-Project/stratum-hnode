#include <EEPROM.h>

void eeprom_setID(byte id) {
  EEPROM.begin(512);
  EEPROM.write(0, id);
  EEPROM.end();
}

byte eeprom_getID() {
  EEPROM.begin(512);
  byte id = EEPROM.read(0);
  EEPROM.end();
  return id;
}


