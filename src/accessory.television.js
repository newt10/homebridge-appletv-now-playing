const lodash = require("lodash");
const Accessory = require("./accessory");

module.exports = class TelevisionAccessory extends Accessory {
    static Type = "Television";

    constructor(platform, config, device) {
        super(TelevisionAccessory.Type, platform, config, device);

        this.createAccessory = this.createAccessory.bind(this);
        this.updateAccessory = this.updateAccessory.bind(this);

        this.configureServices = this.configureServices.bind(this);
        this.configureTelevisionService = this.configureTelevisionService.bind(this);
        this.configureInputServices = this.configureInputServices.bind(this);

        this.setRemote = this.setRemote.bind(this);
        this.setActive = this.setActive.bind(this);
        this.getActive = this.getActive.bind(this);
        this.setActiveIdentifier = this.setActiveIdentifier.bind(this);
        this.getActiveIdentifier = this.getActiveIdentifier.bind(this);
        this.onPowerUpdate = this.onPowerUpdate.bind(this);

        this.active = false;
        this.activeIdentifier = 0;

        this.configureServices();
    }

    createAccessory() {
        this.platform.publishExternalAccessory(this.instance);
    }

    updateAccessory() {
        this.platform.updateAccessory(this.instance);
    }

    configureServices() {
        super.configureServices();
        this.configureTelevisionService();
    }

    configureTelevisionService() {
        super.debug(`configuring television service.`);

        this.service = this.instance.getService(this.platform.api.hap.Service.Television);

        if (!this.service) {
            super.debug(`creating television service.`);

            this.service = this.instance.addService(this.platform.api.hap.Service.Television, `${this.config.name} Television`, `${this.uid}_television`);
        }

        this.service.getCharacteristic(this.platform.api.hap.Characteristic.Active).on("get", this.getActive).on("set", this.setActive);
        this.service.getCharacteristic(this.platform.api.hap.Characteristic.ActiveIdentifier).on("get", this.getActiveIdentifier).on("set", this.setActiveIdentifier);
        this.service.getCharacteristic(this.platform.api.hap.Characteristic.RemoteKey).on("set", this.setRemote);

        this.service.setCharacteristic(this.platform.api.hap.Characteristic.ConfiguredName, `${this.config.name} Television`);
        this.service.setCharacteristic(this.platform.api.hap.Characteristic.SleepDiscoveryMode, this.platform.api.hap.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

        this.configureInputServices();

        this.platform.updateAccessory(this.instance);

        super.log(`television service configured.`);
    }

    configureInputServices() {
        super.debug(`configuring input services.`);

        if (this.instance.context.inputs && this.config.inputs.length < this.instance.context.inputs.length) {
            for (let index = this.config.inputs.length; index < this.instance.context.inputs.length; index++) {
                let inputService = this.instance.getServiceByUUIDAndSubType(this.platform.api.hap.Service.InputSource, `${this.device.uid}_apple_tv_input_${index}`);

                if (inputService) {
                    super.debug(`removing input service => ${index}.`);

                    this.service.removeLinkedService(inputService);
                    this.instance.removeService(inputService);
                }
            }
        }

        lodash.each(this.config.inputs, (input, index) => {
            super.debug(`configuring input service => ${input.name}.`);

            let inputService = this.instance.getServiceByUUIDAndSubType(this.platform.api.hap.Service.InputSource, `${this.device.uid}_apple_tv_input_${index}`);

            if (!inputService) {
                super.debug(`creating input service => ${input.name}.`);

                inputService = new this.platform.api.hap.Service.InputSource(input.name, `${this.device.uid}_apple_tv_input_${index}`);

                this.service.addLinkedService(inputService);
                this.instance.addService(inputService, true);
            }

            inputService
                .setCharacteristic(this.platform.api.hap.Characteristic.Identifier, index)
                .setCharacteristic(this.platform.api.hap.Characteristic.IsConfigured, this.platform.api.hap.Characteristic.IsConfigured.CONFIGURED)
                .setCharacteristic(this.platform.api.hap.Characteristic.InputSourceType, this.platform.api.hap.Characteristic.InputSourceType.APPLICATION)
                .setCharacteristic(this.platform.api.hap.Characteristic.Name, input.name)
                .setCharacteristic(this.platform.api.hap.Characteristic.ConfiguredName, input.name)
                .setCharacteristic(this.platform.api.hap.Characteristic.CurrentVisibilityState, this.platform.api.hap.Characteristic.CurrentVisibilityState.SHOWN);

            super.log(`input service configured => ${input.name}.`);
        });

        this.instance.context.inputs = this.config.inputs;

        super.log(`input services configured.`);
    }

    setRemote(value, callback) {
        super.debug(`setting on remote => ${!!value}`);
    }

    setActive(value, callback) {
        super.debug(`setting active characteristic => ${value}`);

        this.active = value;

        super.togglePower(!!this.active, () => callback(null));
    }

    getActive(callback) {
        super.debug(`requesting active characteristic => ${this.active}`);

        callback(null, this.active);
    }

    setActiveIdentifier(value, callback) {
        super.debug(`setting active identifier characteristic => ${value}`);

        this.activeIdentifier = value;

        callback(null);
    }

    getActiveIdentifier(callback) {
        super.debug(`requesting active identifier characteristic => ${this.activeIdentifier}`);

        callback(null, this.activeIdentifier);
    }

    onPowerUpdate(value) {
        this.active = value ? this.platform.api.hap.Characteristic.Active.ACTIVE : this.platform.api.hap.Characteristic.Active.INACTIVE
        this.service.getCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(this.active);
    }
};
