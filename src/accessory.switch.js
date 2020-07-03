const Accessory = require("./accessory");

module.exports = class SwitchAccessory extends Accessory {
    static Type = "Switch";

    constructor(platform, config, device) {
        super(SwitchAccessory.Type, platform, config, device);

        this.configureServices = this.configureServices.bind(this);
        this.configureSwitchService = this.configureSwitchService.bind(this);

        this.setOn = this.setOn.bind(this);
        this.getOn = this.getOn.bind(this);
        this.setActive = this.setActive.bind(this);
        this.getActive = this.getActive.bind(this);
        this.onPowerUpdate = this.onPowerUpdate.bind(this);

        this.on = false;
        this.active = this.platform.api.hap.Characteristic.Active.INACTIVE;

        this.configureServices();
    }

    configureServices() {
        super.configureServices();
        this.configureSwitchService();
    }

    configureSwitchService() {
        super.debug(`configuring switch service.`);

        this.service = this.instance.getService(this.platform.api.hap.Service.Switch);

        if (!this.service) {
            super.debug(`creating switch service.`);

            this.service = this.instance.addService(this.platform.api.hap.Service.Switch, `${this.config.name} Switch`, `${this.uid}_switch`);
        }

        this.service.getCharacteristic(this.platform.api.hap.Characteristic.On).on("get", this.getOn).on("set", this.setOn);

        super.log(`switch service configured.`);
    }

    setOn(value, callback) {
        super.debug(`setting on characteristic => ${value}`);

        this.on = value;

        super.togglePower(!!this.on, () => callback(null));
    }

    getOn(callback) {
        super.debug(`requesting on characteristic => ${this.on}`);

        callback(null, this.on);
    }

    setActive(value, callback) {
        super.debug(`setting active characteristic => ${value}`);

        this.active = !!value ? this.platform.api.hap.Characteristic.Active.ACTIVE : this.platform.api.hap.Characteristic.Active.INACTIVE;
        
        callback(null);
    }

    getActive(callback) {
        super.debug(`requesting active characteristic => ${this.active}`);

        callback(null, this.active);
    }

    onPowerUpdate(value) {
        this.on = !!value;
        this.service.getCharacteristic(this.platform.api.hap.Characteristic.On).updateValue(this.on);
    }
};
