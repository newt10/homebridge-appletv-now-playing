const lodash = require("lodash");
const Accessory = require("./accessory");

module.exports = class TelevisionAccessory extends Accessory {
    type = "television";

    constructor(platform, config, device) {
        super(this.type, platform, config, device);

        this.configureServices = this.configureServices.bind(this);
        this.configureTelevisionService = this.configureTelevisionService.bind(this);
        this.configureInputServices = this.configureInputServices.bind(this);

        this.setRemote = this.setRemote.bind(this);
        this.setActive = this.setActive.bind(this);
        this.getActive = this.getActive.bind(this);
        this.setActiveIdentifier = this.setActiveIdentifier.bind(this);
        this.getActiveIdentifier = this.getActiveIdentifier.bind(this);

        this.active = false;
        this.activeIdentifier = 0;

        this.configureAccessories(config, device);
    }

    createAccessory() {
        this.platform.publishExternalAccessory(this.instance);
    }

    configureServices() {
        super.configureServices.call(this);
        this.configureTelevisionsService();
    }

    configureTelevisionService() {
        this.debug(`configuring television service.`);

        this.televisionService = this.instance.getService(this.platform.api.hap.Service.Television);

        if (!this.televisionService) {
            this.debug(`creating television service.`);

            this.televisionService = this.instance.addService(this.platform.api.hap.Service.Television, `${this.config.name} Television`, `${this.uid}_television`);
        }

        this.televisionService.getCharacteristic(this.platform.api.hap.Characteristic.Active).on("get", this.getActive).on("set", this.setActive);
        this.televisionService.getCharacteristic(this.platform.api.hap.Characteristic.ActiveIdentifier).on("get", this.getActiveIdentifier).on("set", this.setActiveIdentifier);
        this.televisionService.getCharacteristic(this.platform.api.hap.Characteristic.RemoteKey).on("set", this.setRemote);

        this.televisionService.setCharacteristic(this.platform.api.hap.Characteristic.ConfiguredName, `${this.config.name} Television`);
        this.televisionService.setCharacteristic(
            this.platform.api.hap.Characteristic.SleepDiscoveryMode,
            this.platform.api.hap.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE
        );

        this.configureInputServices();

        this.log(`television service configured.`);
    }

    configureInputServices() {
        this.debug(`configuring input services.`);

        if (this.instance.context.inputs && this.config.inputs.length < this.instance.context.inputs.length) {
            for (let index = this.config.inputs.length; index < this.instance.context.inputs.length; index++) {
                let inputService = this.instance.getServiceByUUIDAndSubType(this.platform.api.hap.Service.InputSource, `${this.device.uid}_apple_tv_input_${index}`);

                if(inputService) {
                    this.instance.removeService(inputService);
                }
            }
        }

        lodash.each(this.config.inputs, (input, index) => {
            this.debug(`configuring input service for ${input.name}.`);

            let inputService = this.instance.getServiceByUUIDAndSubType(this.platform.api.hap.Service.InputSource, `${this.device.uid}_apple_tv_input_${index}`);

            if (!inputService) {
                this.debug(`creating input service for ${input.name}.`);

                inputService = new this.platform.api.hap.Service.InputSource(input.name, `${this.device.uid}_apple_tv_input_${index}`);

                this.televisionService.addLinkedService(inputService);
                this.instance.addService(inputService);
            }

            inputService
                .setCharacteristic(this.platform.api.hap.Characteristic.Identifier, index)
                .setCharacteristic(this.platform.api.hap.Characteristic.IsConfigured, this.platform.api.hap.Characteristic.IsConfigured.CONFIGURED)
                .setCharacteristic(this.platform.api.hap.Characteristic.InputSourceType, this.platform.api.hap.Characteristic.InputSourceType.APPLICATION)
                .setCharacteristic(this.platform.api.hap.Characteristic.Name, input.name)
                .setCharacteristic(this.platform.api.hap.Characteristic.ConfiguredName, input.name)
                .setCharacteristic(this.platform.api.hap.Characteristic.CurrentVisibilityState, this.platform.api.hap.Characteristic.CurrentVisibilityState.SHOWN);

            this.log(`input service for ${input.name} configured.`);
        });

        this.instance.context.inputs = this.config.inputs;

        this.log(`input services configured.`);
    }

    setRemote(value, callback) {
        this.debug(`setting on remote => ${!!value}`);
    }

    setActive(value, callback) {
        this.debug(`setting active characteristic => ${value}`);

        this.active = value;
        this.televisionService.getCharacteristic(this.platform.api.hap.Characteristic.Active).updateValue(this.active);

        callback(null);
    }

    getActive(callback) {
        this.debug(`requesting active characteristic => ${this.active}`);

        callback(null, this.active);
    }

    setActiveIdentifier(value, callback) {
        this.debug(`setting active identifier characteristic => ${value}`);

        this.activeIdentifier = value;

        callback(null);
    }

    getActiveIdentifier(callback) {
        this.debug(`requesting active identifier characteristic => ${this.activeIdentifier}`);

        callback(null, this.activeIdentifier);
    }
};
