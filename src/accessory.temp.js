const Accessory = require("./accessory");

module.exports = class TempAccessory extends Accessory {
    constructor(platform, config, device) {
        let accessoryUid = platform.api.hap.uuid.generate(`${device.uid}`);
        let accessory = new this.platform.api.platformAccessory(config.name, accessoryUid);

        this.on = false;

        accessory
            .getService(platform.api.hap.Service.AccessoryInformation)
            .setCharacteristic(platform.api.hap.Characteristic.Manufacturer, "Apple")
            .setCharacteristic(platform.api.hap.Characteristic.Model, "Apple TV")
            .setCharacteristic(platform.api.hap.Characteristic.SerialNumber, device.uid)
            .setCharacteristic(platform.api.hap.Characteristic.Name, config.name);

        let service = accessory.getService(platform.api.hap.Service.Switch);

        if (!service) {
            service = accessory.addService(platform.api.hap.Service.Switch, `${config.name} Switch`, `${accessory.context.uid}_switch`);
        }

        service
            .getCharacteristic(platform.api.hap.Characteristic.On)
            .on("get", (callback) => {
                platform.log(`requesting on characteristic => ${this.on}`);
                callback(null, this.on);
            })
            .on("set", (value, callback) => {
                platform.log(`setting on characteristic => ${value}`);
                this.on = value;
                callback(null);
            });
    }
};
