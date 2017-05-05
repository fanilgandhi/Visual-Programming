Blockly.Blocks['sum'] = {
  init: function() {
    this.appendValueInput("NUM1")
        .setCheck("Number")
        .appendField("X");
    this.appendValueInput("NUM2")
        .setCheck("Number")
        .appendField(new Blockly.FieldDropdown([["+", "add"], ["-", "sub"], ["*", "mul"], ["/", "div"]]), "math")
        .appendField("Y");
    this.setInputsInline(true);
    this.setOutput(true, "Number");
    this.setColour(75);
    this.setTooltip('');
    this.setHelpUrl('http://www.example.com/');
  }
};