const Accessory = require("./accessory");

module.exports = class SwitchAccessory extends Accessory {
    static Type = "switch";

    constructor(platform, config, device) {
        super(SwitchAccessory.Type, platform, config, device);

        this.configureServices = this.configureServices.bind(this);
        this.configureSwitchService = this.configureSwitchService.bind(this);

        this.setOn = this.setOn.bind(this);
        this.getOn = this.getOn.bind(this);
        this.setActive = this.setActive.bind(this);
        this.getActive = this.getActive.bind(this);

        this.on = false;
        this.active = this.Characteristic.Active.INACTIVE;
    }

    configureServices() {
        super.configureServices.call(this);
        this.configureSwitchService();
    }

    configureSwitchService() {
        this.debug(`configuring switch service.`);

        this.service = this.instance.getService(this.platform.api.hap.Service.Switch);

        if (!this.service) {
            this.debug(`creating switch service.`);

            this.service = this.instance.addService(this.platform.api.hap.Service.Switch, `${this.config.name} Switch`, `${this.uid}_switch`);
        }

        this.service.getCharacteristic(this.platform.api.hap.Characteristic.On).on("get", this.getOn).on("set", this.setOn);

        this.log(`switch service configured.`);
    }

    setOn(value, callback) {
        this.debug(`setting on characteristic => ${value}`);

        this.on = value;
        this.service.getCharacteristic(this.platform.api.hap.Characteristic.On).updateValue(this.on);

        callback(null);
    }

    getOn(callback) {
        this.debug(`requesting on characteristic => ${this.on}`);

        callback(null, this.on);
    }

    setActive(value, callback) {
        this.debug(`setting active characteristic => ${value}`);

        this.active = value;

        this.service.getCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(this.active);

        callback(null);
    }

    getActive(callback) {
        this.debug(`requesting active characteristic => ${this.active}`);

        callback(null, this.active);
    }
};
