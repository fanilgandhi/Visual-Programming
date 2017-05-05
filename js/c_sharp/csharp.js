'use strict';

goog.provide('Blockly.CSharp');

goog.require('Blockly.Generator');

Blockly.CSharp = new Blockly.Generator('CSharp');

Blockly.CSharp.addReservedWords(
    //http://msdn.microsoft.com/en-us/library/x53a06bb.aspx
    'abstract,as,base,bool,break,byte,case,catch,char,checked,class,const,continue,decimal,default,delegate,do,double,else,enum,event,explicit,extern,false,finally,fixed,float,for,foreach,goto,if,implicit,in,int,interface,internal,is,lock,long,namespace,new,null,object,operator,out,override,params,private,protected,public,readonly,ref,return,sbyte,sealed,short,sizeof,stackalloc,static,string,struct,switch,this,throw,true,try,typeof,uint,ulong,unchecked,unsafe,ushort,using,virtual,void,volatile,while'
    );

Blockly.CSharp.ORDER_ATOMIC = 0;         // 0 ""
Blockly.CSharp.ORDER_MEMBER = 1;         // . []
Blockly.CSharp.ORDER_NEW = 1;            // new
Blockly.CSharp.ORDER_TYPEOF = 1;         // typeof
Blockly.CSharp.ORDER_FUNCTION_CALL = 1;  // ()
Blockly.CSharp.ORDER_INCREMENT = 1;      // ++
Blockly.CSharp.ORDER_DECREMENT = 1;      // --
Blockly.CSharp.ORDER_LOGICAL_NOT = 2;    // !
Blockly.CSharp.ORDER_BITWISE_NOT = 2;    // ~
Blockly.CSharp.ORDER_UNARY_PLUS = 2;     // +
Blockly.CSharp.ORDER_UNARY_NEGATION = 2; // -
Blockly.CSharp.ORDER_MULTIPLICATION = 3; // *
Blockly.CSharp.ORDER_DIVISION = 3;       // /
Blockly.CSharp.ORDER_MODULUS = 3;        // %
Blockly.CSharp.ORDER_ADDITION = 4;       // +
Blockly.CSharp.ORDER_SUBTRACTION = 4;    // -
Blockly.CSharp.ORDER_BITWISE_SHIFT = 5;  // << >>
Blockly.CSharp.ORDER_RELATIONAL = 6;     // < <= > >=
Blockly.CSharp.ORDER_EQUALITY = 7;       // == !=
Blockly.CSharp.ORDER_BITWISE_AND = 8;   // &
Blockly.CSharp.ORDER_BITWISE_XOR = 9;   // ^
Blockly.CSharp.ORDER_BITWISE_OR = 10;    // |
Blockly.CSharp.ORDER_LOGICAL_AND = 11;   // &&
Blockly.CSharp.ORDER_LOGICAL_OR = 12;    // ||
Blockly.CSharp.ORDER_CONDITIONAL = 13;   // ?:
Blockly.CSharp.ORDER_ASSIGNMENT = 14;    // = += -= *= /= %= <<= >>= ...
Blockly.CSharp.ORDER_COMMA = 15;         // ,
Blockly.CSharp.ORDER_NONE = 99;          // (...)

/**
 * Arbitrary code to inject into locations that risk causing infinite loops.
 * Any instances of '%1' will be replaced by the block ID that failed.
 * E.g. '  checkTimeout(%1);\n'
 * @type ?string
 */
Blockly.CSharp.INFINITE_LOOP_TRAP = null;

Blockly.CSharp.init = function() {
  Blockly.CSharp.definitions_ = {};

  if (Blockly.Variables) {
    if (!Blockly.CSharp.variableDB_) {
      Blockly.CSharp.variableDB_ =
          new Blockly.Names(Blockly.CSharp.RESERVED_WORDS_);
    } else {
      Blockly.CSharp.variableDB_.reset();
    }

    var defvars = [];
    var variables = workspace.variableList;
    for (var x = 0; x < variables.length; x++) {
      defvars[x] = 'dynamic ' +
          Blockly.CSharp.variableDB_.getName(variables[x],
          Blockly.Variables.NAME_TYPE) + ';';
    }
    Blockly.CSharp.definitions_['variables'] = defvars.join('\n');
  }
};

/* Prepend the generated code with the variable definitions. */
Blockly.CSharp.finish = function(code) {
  var definitions = [];
  for (var name in Blockly.CSharp.definitions_) {
    definitions.push(Blockly.CSharp.definitions_[name]);
  }
  return definitions.join('\n\n') + '\n\n\n' + code;
};

/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything.  A trailing semicolon is needed to make this legal.
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
Blockly.CSharp.scrubNakedValue = function(line) {
  return line + ';\n';
};

Blockly.CSharp.quote_ = function(val) {
  return goog.string.quote(val);
};

/**
 * Common tasks for generating CSharp from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The CSharp code created for this block.
 * @return {string} CSharp code with comments and subsequent blocks added.
 * @this {Blockly.CodeGenerator}
 * @private
 */
Blockly.CSharp.scrub_ = function(block, code) {
  if (code === null) {
    // Block has handled code generation itself.
    return '';
  }
  var commentCode = '';
  // Only collect comments for blocks that aren't inline.
  if (!block.outputConnection || !block.outputConnection.targetConnection) {
    // Collect comment for this block.
    var comment = block.getCommentText();
    if (comment) {
      commentCode += this.prefixLines(comment, '// ') + '\n';
    }
    // Collect comments for all value arguments.
    // Don't collect comments for nested statements.
    for (var x = 0; x < block.inputList.length; x++) {
      if (block.inputList[x].type == Blockly.INPUT_VALUE) {
        var childBlock = block.inputList[x].connection.targetBlock();
        if (childBlock) {
          var comment = this.allNestedComments(childBlock);
          if (comment) {
            commentCode += this.prefixLines(comment, '// ');
          }
        }
      }
    }
  }
  var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  var nextCode = this.blockToCode(nextBlock);
  return commentCode + code + nextCode;
};




Blockly.CSharp.text = {};

Blockly.CSharp.text = function() {
  // Text value.
  var code = Blockly.CSharp.quote_(this.getTitleValue('TEXT'));
  return [code, Blockly.CSharp.ORDER_ATOMIC];
};

Blockly.CSharp.text_join = function() {
  // Create a string made up of any number of elements of any type.
  var code;
  if (this.itemCount_ == 0) {
    return ['""', Blockly.CSharp.ORDER_ATOMIC];
  } else if (this.itemCount_ == 1) {
    var argument0 = Blockly.CSharp.valueToCode(this, 'ADD0', Blockly.CSharp.ORDER_NONE) || '""';
    code = argument0 + '.ToString()';
    return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
  } else if (this.itemCount_ == 2) {
    var argument0 = Blockly.CSharp.valueToCode(this, 'ADD0', Blockly.CSharp.ORDER_NONE) || '""';
    var argument1 = Blockly.CSharp.valueToCode(this, 'ADD1', Blockly.CSharp.ORDER_NONE) || '""';
    code = 'String.Concat(' + argument0 + ', ' + argument1 + ')';
    return [code, Blockly.CSharp.ORDER_ADDITION];
  } else {
    code = new Array(this.itemCount_);
    for (var n = 0; n < this.itemCount_; n++) {
      code[n] = Blockly.CSharp.valueToCode(this, 'ADD' + n, Blockly.CSharp.ORDER_COMMA) || '""';
    }
    code = 'String.Concat(' + code.join(', ') + ')';
    return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
  }
};

Blockly.CSharp.text_append = function() {
  // Append to a variable in place.
  var varName = Blockly.CSharp.variableDB_.getName(this.getTitleValue('VAR'), Blockly.Variables.NAME_TYPE);
  var argument0 = Blockly.CSharp.valueToCode(this, 'TEXT',
      Blockly.CSharp.ORDER_NONE) || '""';
  return varName + ' = String.Concat(' + varName + ', ' + argument0 + ');\n';
};

Blockly.CSharp.text_length = function() {
  // String length.
  var argument0 = Blockly.CSharp.valueToCode(this, 'VALUE', Blockly.CSharp.ORDER_FUNCTION_CALL) || '""';
  return [argument0 + '.Length', Blockly.CSharp.ORDER_MEMBER];
};

Blockly.CSharp.text_isEmpty = function() {
  // Is the string null?
  var argument0 = Blockly.CSharp.valueToCode(this, 'VALUE', Blockly.CSharp.ORDER_MEMBER) || '""';
  return [argument0 + '.Length == 0', Blockly.CSharp.ORDER_EQUALITY];
};

Blockly.CSharp.text_indexOf = function() {
  // Search the text for a substring.
  var operator = this.getTitleValue('END') == 'FIRST' ?
      'IndexOf' : 'LastIndexOf';
  var argument0 = Blockly.CSharp.valueToCode(this, 'FIND', Blockly.CSharp.ORDER_NONE) || '""';
  var argument1 = Blockly.CSharp.valueToCode(this, 'VALUE', Blockly.CSharp.ORDER_MEMBER) || '""';
  var code = argument1 + '.' + operator + '(' + argument0 + ') + 1';
  return [code, Blockly.CSharp.ORDER_MEMBER];
};

Blockly.CSharp.text_charAt = function() {
  var where = this.getTitleValue('WHERE') || 'FROM_START';
  var at = Blockly.CSharp.valueToCode(this, 'AT',
      Blockly.CSharp.ORDER_UNARY_NEGATION) || '1';
  var text = Blockly.CSharp.valueToCode(this, 'VALUE',
      Blockly.CSharp.ORDER_MEMBER) || '""';

  // Blockly uses one-based indicies.

  switch (where) {
    case 'FIRST':
      var code = text + '.First()';
      return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
    case 'LAST':
      var code = text + '.Last()';
      return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
    case 'FROM_START':
      var code = text + '[' + at + ' - 1]';
      return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
    case 'FROM_END':
        var code = text + '[text.Length - ' + at + ']';
      return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
    case 'RANDOM':
      if (!Blockly.CSharp.definitions_['text_random_letter']) {
        var functionName = Blockly.CSharp.variableDB_.getDistinctName(
            'text_random_letter', Blockly.Generator.NAME_TYPE);
        Blockly.CSharp.text_charAt.text_random_letter = functionName;
        var func = [];
        func.push('var ' + functionName + ' = new Func<string, char>((text) => {');
        func.push('  var x = (new Random()).Next(text.length);');
        func.push('  return text[x];');
        func.push('});');
        Blockly.CSharp.definitions_['text_random_letter'] = func.join('\n');
      }
      code = Blockly.CSharp.text_charAt.text_random_letter +
          '(' + text + ')';
      return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
  }
  throw 'Unhandled option (text_charAt).';
};

Blockly.CSharp.text_getSubstring = function() {
  // Get substring.
  var text = Blockly.CSharp.valueToCode(this, 'STRING', Blockly.CSharp.ORDER_MEMBER) || 'null';
  var where1 = this.getTitleValue('WHERE1');
  var where2 = this.getTitleValue('WHERE2');
  var at1 = Blockly.CSharp.valueToCode(this, 'AT1', Blockly.CSharp.ORDER_NONE) || '1';
  var at2 = Blockly.CSharp.valueToCode(this, 'AT2', Blockly.CSharp.ORDER_NONE) || '1';
  if (where1 == 'FIRST' && where2 == 'LAST') {
    var code = text;
  } else {
    if (!Blockly.CSharp.definitions_['text_get_substring']) {
      var functionName = Blockly.CSharp.variableDB_.getDistinctName(
          'text_get_substring', Blockly.Generator.NAME_TYPE);
      Blockly.CSharp.text_getSubstring.func = functionName;
      var func = [];
      func.push('var ' + functionName + ' = new Func<string, dynamic, int, dynamic, int, string>((text, where1, at1, where2, at2) => {');
      func.push('  var getAt =new Func<dynamic, int, int>((where, at) => {');
      func.push('    if (where == "FROM_START") {');
      func.push('      at--;');
      func.push('    } else if (where == "FROM_END") {');
      func.push('      at = text.Length - at;');
      func.push('    } else if (where == "FIRST") {');
      func.push('      at = 0;');
      func.push('    } else if (where == "LAST") {');
      func.push('      at = text.Length - 1;');
      func.push('    } else {');
      func.push('      throw new ApplicationException("Unhandled option (text_getSubstring).");');
      func.push('    }');
      func.push('    return at;');
      func.push('  });');
      func.push('  at1 = getAt(where1, at1);');
      func.push('  at2 = getAt(where2, at2) + 1;');
      func.push('  return text.Substring(at1, at2 - at1);');
      func.push('});');
      Blockly.CSharp.definitions_['text_get_substring'] =
          func.join('\n');
    }
    var code = Blockly.CSharp.text_getSubstring.func + '(' + text + ', "' + where1 + '", ' + at1 + ', "' + where2 + '", ' + at2 + ')';
  }
  return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
};

Blockly.CSharp.text_changeCase = function() {
  // Change capitalization.
  var mode = this.getTitleValue('CASE');
  var operator = Blockly.CSharp.text_changeCase.OPERATORS[mode];
  var code;
  if (operator) {
    // Upper and lower case are functions built into CSharp.
    var argument0 = Blockly.CSharp.valueToCode(this, 'TEXT', Blockly.CSharp.ORDER_MEMBER) || '""';
    code = argument0 + operator;
  } else {
    if (!Blockly.CSharp.definitions_['text_toTitleCase']) {
      // Title case is not a native CSharp function.  Define one.
      var functionName = Blockly.CSharp.variableDB_.getDistinctName('text_toTitleCase', Blockly.Generator.NAME_TYPE);
      Blockly.CSharp.text_changeCase.toTitleCase = functionName;
      var func = [];
      func.push('var ' + functionName + ' = new Func<string, string>((str) => {');
      func.push('  var buf = new StringBuilder(str.Length);');
      func.push('  var toUpper = true;');
      func.push('  foreach (var ch in str) {');
      func.push('    buf.Append(toUpper ? Char.ToUpper(ch) : ch);');
      func.push('    toUpper = Char.IsWhiteSpace(ch);');
      func.push('  }');
      func.push('  return buf.ToString();');
      func.push('});');
      Blockly.CSharp.definitions_['text_toTitleCase'] = func.join('\n');
    }
    var argument0 = Blockly.CSharp.valueToCode(this, 'TEXT',
        Blockly.CSharp.ORDER_NONE) || '""';
    code = Blockly.CSharp.text_changeCase.toTitleCase + '(' + argument0 + ')';
  }
  return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
};

Blockly.CSharp.text_changeCase.OPERATORS = {
  UPPERCASE: '.ToUpper()',
  LOWERCASE: '.ToLower()',
  TITLECASE: null
};

Blockly.CSharp.text_trim = function() {
  // Trim spaces.
  var mode = this.getTitleValue('MODE');
  var operator = Blockly.CSharp.text_trim.OPERATORS[mode];
  var argument0 = Blockly.CSharp.valueToCode(this, 'TEXT', Blockly.CSharp.ORDER_MEMBER) || '""';
  return [argument0 + operator, Blockly.CSharp.ORDER_FUNCTION_CALL];
};

Blockly.CSharp.text_trim.OPERATORS = {
  LEFT: '.TrimStart()',
  RIGHT: '.TrimEnd()',
  BOTH: '.Trim()'
};

Blockly.CSharp.text_print = function() {
  // Print statement.
  var argument0 = Blockly.CSharp.valueToCode(this, 'TEXT', Blockly.CSharp.ORDER_NONE) || '""';
  return 'Console.WriteLine(' + argument0 + ');\n';
};

Blockly.CSharp.text_prompt = function () {
    var msg = Blockly.CSharp.quote_(this.getTitleValue('TEXT'));
    var toNumber = this.getTitleValue('TYPE') == 'NUMBER';

    var functionName = Blockly.CSharp.variableDB_.getDistinctName('text_promptInput', Blockly.Generator.NAME_TYPE);
    Blockly.CSharp.text_prompt.promptInput = functionName;
    var func = [];
    func.push('var ' + functionName + ' = new Func<string, bool, dynamic>((msg, toNumber) => {');
    func.push('  Console.WriteLine(msg);');
    func.push('  var res = Console.ReadLine();');
    func.push('  if (toNumber)');
    func.push('    return Double.Parse(res);');
    func.push('  return res;');
    func.push('});');
    Blockly.CSharp.definitions_['text_promptInput'] = func.join('\n');

    var code = Blockly.CSharp.text_prompt.promptInput + '(' + msg + ', ' + toNumber + ')';
    return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
};

Blockly.CSharp.variables = {};

Blockly.CSharp.variables_get = function() {
  // Variable getter.
  var code = Blockly.CSharp.variableDB_.getName(this.getTitleValue('VAR'),
      Blockly.Variables.NAME_TYPE);
  return [code, Blockly.CSharp.ORDER_ATOMIC];
};

Blockly.CSharp.variables_set = function() {
  // Variable setter.
  var argument0 = Blockly.CSharp.valueToCode(this, 'VALUE',
      Blockly.CSharp.ORDER_ASSIGNMENT) || 'null';
  var varName = Blockly.CSharp.variableDB_.getName(
      this.getTitleValue('VAR'), Blockly.Variables.NAME_TYPE);
  return varName + ' = ' + argument0 + ';\n';
};



Blockly.CSharp.math = {};

Blockly.CSharp.math_number = function() {
  // Numeric value.
  var code = window.parseFloat(this.getTitleValue('NUM'));
  return [code, Blockly.CSharp.ORDER_ATOMIC];
};

Blockly.CSharp.math_arithmetic = function() {
  // Basic arithmetic operators, and power.
  var mode = this.getTitleValue('OP');
  var tuple = Blockly.CSharp.math_arithmetic.OPERATORS[mode];
  var operator = tuple[0];
  var order = tuple[1];
  var argument0 = Blockly.CSharp.valueToCode(this, 'A', order) || '0.0';
  var argument1 = Blockly.CSharp.valueToCode(this, 'B', order) || '0.0';
  var code;
  // Power in CSharp requires a special case since it has no operator.
  if (!operator) {
    code = 'Math.Pow(' + argument0 + ', ' + argument1 + ')';
    return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
  }
  code = argument0 + operator + argument1;
  return [code, order];
};

Blockly.CSharp.math_arithmetic.OPERATORS = {
  ADD: [' + ', Blockly.CSharp.ORDER_ADDITION],
  MINUS: [' - ', Blockly.CSharp.ORDER_SUBTRACTION],
  MULTIPLY: [' * ', Blockly.CSharp.ORDER_MULTIPLICATION],
  DIVIDE: [' / ', Blockly.CSharp.ORDER_DIVISION],
  POWER: [null, Blockly.CSharp.ORDER_COMMA]  // Handle power separately.
};

Blockly.CSharp.math_single = function() {
  // Math operators with single operand.
  var operator = this.getTitleValue('OP');
  var code;
  var arg;
  if (operator == 'NEG') {
    // Negation is a special case given its different operator precedence.
    arg = Blockly.CSharp.valueToCode(this, 'NUM',
        Blockly.CSharp.ORDER_UNARY_NEGATION) || '0.0';
    if (arg[0] == '-') {
      // --3 is not allowed
      arg = ' ' + arg;
    }
    code = '-' + arg;
    return [code, Blockly.CSharp.ORDER_UNARY_NEGATION];
  }
  if (operator == 'SIN' || operator == 'COS' || operator == 'TAN') {
    arg = Blockly.CSharp.valueToCode(this, 'NUM',
        Blockly.CSharp.ORDER_DIVISION) || '0';
  } else {
    arg = Blockly.CSharp.valueToCode(this, 'NUM',
        Blockly.CSharp.ORDER_NONE) || '0.0';
  }
  // First, handle cases which generate values that don't need parentheses
  // wrapping the code.
  switch (operator) {
    case 'ABS':
      code = 'Math.Abs(' + arg + ')';
      break;
    case 'ROOT':
      code = 'Math.Sqrt(' + arg + ')';
      break;
    case 'LN':
      code = 'Math.Log(' + arg + ')';
      break;
    case 'LOG10':
      code = 'Math.Log10(' + arg + ')';
      break;
    case 'EXP':
      code = 'Math.Exp(' + arg + ')';
      break;
    case 'POW10':
      code = 'Math.Pow(' + arg + ', 10)';
      break;
    case 'ROUND':
      code = 'Math.Round(' + arg + ')';
      break;
    case 'ROUNDUP':
      code = 'Math.Ceil(' + arg + ')';
      break;
    case 'ROUNDDOWN':
      code = 'Math.Floor(' + arg + ')';
      break;
    case 'SIN':
      code = 'Math.Sin(' + arg + ' / 180 * Math.PI)';
      break;
    case 'COS':
      code = 'Math.Cos(' + arg + ' / 180 * Math.PI)';
      break;
    case 'TAN':
      code = 'Math.Tan(' + arg + ' / 180 * Math.PI)';
      break;
  }
  if (code) {
    return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
  }
  // Second, handle cases which generate values that may need parentheses
  // wrapping the code.
  switch (operator) {
    case 'ASIN':
      code = 'Math.Asin(' + arg + ') / Math.PI * 180';
      break;
    case 'ACOS':
      code = 'Math.Acos(' + arg + ') / Math.PI * 180';
      break;
    case 'ATAN':
      code = 'Math.Atan(' + arg + ') / Math.PI * 180';
      break;
    default:
      throw 'Unknown math operator: ' + operator;
  }
  return [code, Blockly.CSharp.ORDER_DIVISION];
};

Blockly.CSharp.math_constant = function() {
  // Constants: PI, E, the Golden Ratio, sqrt(2), 1/sqrt(2), INFINITY.
  var constant = this.getTitleValue('CONSTANT');
  return Blockly.CSharp.math_constant.CONSTANTS[constant];
};

Blockly.CSharp.math_constant.CONSTANTS = {
  PI: ['Math.PI', Blockly.CSharp.ORDER_MEMBER],
  E: ['Math.E', Blockly.CSharp.ORDER_MEMBER],
  GOLDEN_RATIO: ['(1 + Math.Sqrt(5)) / 2', Blockly.CSharp.ORDER_DIVISION],
  SQRT2: ['Math.Sqrt(2)', Blockly.CSharp.ORDER_MEMBER],
  SQRT1_2: ['Math.Sqrt(1.0 / 2)', Blockly.CSharp.ORDER_MEMBER],
  INFINITY: ['double.PositiveInfinity', Blockly.CSharp.ORDER_ATOMIC]
};

Blockly.CSharp.math_number_property = function() {
  // Check if a number is even, odd, prime, whole, positive, or negative
  // or if it is divisible by certain number. Returns true or false.
  var number_to_check = Blockly.CSharp.valueToCode(this, 'NUMBER_TO_CHECK',
      Blockly.CSharp.ORDER_MODULUS) || 'double.NaN';
  var dropdown_property = this.getTitleValue('PROPERTY');
  var code;
  if (dropdown_property == 'PRIME') {
    // Prime is a special case as it is not a one-liner test.
    if (!Blockly.CSharp.definitions_['isPrime']) {
      var functionName = Blockly.CSharp.variableDB_.getDistinctName(
          'isPrime', Blockly.Generator.NAME_TYPE);
      Blockly.CSharp.logic_prime= functionName;
      var func = [];
      func.push('var ' + functionName + ' = new Func<double, bool>((n) => {');
      func.push('  // http://en.wikipedia.org/wiki/Primality_test#Naive_methods');
      func.push('  if (n == 2.0 || n == 3.0)');
      func.push('    return true;');
      func.push('  // False if n is NaN, negative, is 1, or not whole. And false if n is divisible by 2 or 3.');
      func.push('  if (double.IsNaN(n) || n <= 1 || n % 1 != 0.0 || n % 2 == 0.0 || n % 3 == 0.0)');
      func.push('    return false;');
      func.push('  // Check all the numbers of form 6k +/- 1, up to sqrt(n).');
      func.push('  for (var x = 6; x <= Math.Sqrt(n) + 1; x += 6) {');
      func.push('    if (n % (x - 1) == 0.0 || n % (x + 1) == 0.0)');
      func.push('      return false;');
      func.push('  }');
      func.push('  return true;');
      func.push('});');
      Blockly.CSharp.definitions_['isPrime'] = func.join('\n');
    }
    code = Blockly.CSharp.logic_prime + '(' + number_to_check + ')';
    return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
  }
  switch (dropdown_property) {
    case 'EVEN':
      code = number_to_check + ' % 2 == 0';
      break;
    case 'ODD':
      code = number_to_check + ' % 2 == 1';
      break;
    case 'WHOLE':
      code = number_to_check + ' % 1 == 0';
      break;
    case 'POSITIVE':
      code = number_to_check + ' > 0';
      break;
    case 'NEGATIVE':
      code = number_to_check + ' < 0';
      break;
    case 'DIVISIBLE_BY':
      var divisor = Blockly.CSharp.valueToCode(this, 'DIVISOR',
          Blockly.CSharp.ORDER_MODULUS) || 'double.NaN';
      code = number_to_check + ' % ' + divisor + ' == 0';
      break;
  }
  return [code, Blockly.CSharp.ORDER_EQUALITY];
};

Blockly.CSharp.math_change = function() {
  // Add to a variable in place.
  var argument0 = Blockly.CSharp.valueToCode(this, 'DELTA',
      Blockly.CSharp.ORDER_ADDITION) || '0.0';
  var varName = Blockly.CSharp.variableDB_.getName(
      this.getTitleValue('VAR'), Blockly.Variables.NAME_TYPE);
  return varName + ' = (' + varName + '.GetType().Name == "Double" ? ' + varName + ' : 0.0) + ' + argument0 + ';\n';
};

// Rounding functions have a single operand.
Blockly.CSharp.math_round = Blockly.CSharp.math_single;
// Trigonometry functions have a single operand.
Blockly.CSharp.math_trig = Blockly.CSharp.math_single;

Blockly.CSharp.math_on_list = function() {
  // Math functions for lists.
  var func = this.getTitleValue('OP');
  var list, code;
  switch (func) {
    case 'SUM':
      list = Blockly.CSharp.valueToCode(this, 'LIST',
          Blockly.CSharp.ORDER_MEMBER) || 'new List<dynamic>()';
      code = list + '.Aggregate((x, y) => x + y)';
      break;
    case 'MIN':
      list = Blockly.CSharp.valueToCode(this, 'LIST',
          Blockly.CSharp.ORDER_COMMA) || 'new List<dynamic>()';
      code = list + '.Min()';
      break;
    case 'MAX':
      list = Blockly.CSharp.valueToCode(this, 'LIST',
          Blockly.CSharp.ORDER_COMMA) || 'new List<dynamic>()';
      code = list + '.Max()';
      break;
    case 'AVERAGE':
      list = Blockly.CSharp.valueToCode(this, 'LIST',
          Blockly.CSharp.ORDER_COMMA) || 'new List<dynamic>()';
      code = list + '.Average()';
      break;
    case 'MEDIAN':
      // math_median([null,null,1,3]) == 2.0.
      if (!Blockly.CSharp.definitions_['math_median']) {
        var functionName = Blockly.CSharp.variableDB_.getDistinctName(
            'math_median', Blockly.Generator.NAME_TYPE);
        Blockly.CSharp.math_on_list.math_median = functionName;
        var func = [];
        func.push('var ' + functionName + ' = new Func<List<dynamic>,dynamic>((vals) => {');
        func.push('  vals.Sort();');
        func.push('  if (vals.Count % 2 == 0)');
        func.push('    return (vals[vals.Count / 2 - 1] + vals[vals.Count / 2]) / 2;');
        func.push('  else');
        func.push('    return vals[(vals.Count - 1) / 2];');
        func.push('});');
        Blockly.CSharp.definitions_['math_median'] = func.join('\n');
      }
      list = Blockly.CSharp.valueToCode(this, 'LIST',
          Blockly.CSharp.ORDER_NONE) || 'new List<dynamic>()';
      code = Blockly.CSharp.math_on_list.math_median + '(' + list + ')';
      break;
    case 'MODE':
      if (!Blockly.CSharp.definitions_['math_modes']) {
        var functionName = Blockly.CSharp.variableDB_.getDistinctName(
            'math_modes', Blockly.Generator.NAME_TYPE);
        Blockly.CSharp.math_on_list.math_modes = functionName;
        // As a list of numbers can contain more than one mode,
        // the returned result is provided as an array.
        // Mode of [3, 'x', 'x', 1, 1, 2, '3'] -> ['x', 1].
        var func = [];
        func.push('var ' + functionName + ' = new Func<List<dynamic>,List<dynamic>>((values) => {');
        func.push('  var modes = new List<dynamic>();');
        func.push('  var counts = new Dictionary<double, int>();');
        func.push('  var maxCount = 0;');
        func.push('  foreach (var value in values) {');
        func.push('    int storedCount;');
        func.push('    if (counts.TryGetValue(value, out storedCount)) {');
        func.push('      maxCount = Math.Max(maxCount, ++counts[value]);');
        func.push('    }');
        func.push('    else {');
        func.push('      counts.Add(value, 1);');
        func.push('      maxCount = 1;');
        func.push('    }');
        func.push('  }');
        func.push('  foreach (var pair in counts) {');
        func.push('    if (pair.Value == maxCount)');
        func.push('      modes.Add(pair.Key);');
        func.push('  }');
        func.push('  return modes;');
        func.push('});');
        Blockly.CSharp.definitions_['math_modes'] = func.join('\n');
      }
      list = Blockly.CSharp.valueToCode(this, 'LIST',
          Blockly.CSharp.ORDER_NONE) || 'new List<dynamic>()';
      code = Blockly.CSharp.math_on_list.math_modes + '(' + list + ')';
      break;
    case 'STD_DEV':
      if (!Blockly.CSharp.definitions_['math_standard_deviation']) {
        var functionName = Blockly.CSharp.variableDB_.getDistinctName(
            'math_standard_deviation', Blockly.Generator.NAME_TYPE);
        Blockly.CSharp.math_on_list.math_standard_deviation = functionName;
        var func = [];
        func.push('var ' + functionName + ' = new Func<List<dynamic>,double>((numbers) => {');
        func.push('  var n = numbers.Count;');
        func.push('  var mean = numbers.Average(val => val);');
        func.push('  var variance = 0.0;');
        func.push('  for (var j = 0; j < n; j++) {');
        func.push('    variance += Math.Pow(numbers[j] - mean, 2);');
        func.push('  }');
        func.push('  variance = variance / n;');
        func.push('  return Math.Sqrt(variance);');
        func.push('});');
        Blockly.CSharp.definitions_['math_standard_deviation'] =
            func.join('\n');
      }
      list = Blockly.CSharp.valueToCode(this, 'LIST',
          Blockly.CSharp.ORDER_NONE) || 'new List<dynamic>()';
      code = Blockly.CSharp.math_on_list.math_standard_deviation +
          '(' + list + ')';
      break;
    case 'RANDOM':
      if (!Blockly.CSharp.definitions_['math_random_item']) {
        var functionName = Blockly.CSharp.variableDB_.getDistinctName(
            'math_random_item', Blockly.Generator.NAME_TYPE);
        Blockly.CSharp.math_on_list.math_random_item = functionName;
        var func = [];
        func.push('var ' + functionName + ' = new Func<List<dynamic>,dynamic>((list) => {');
        func.push('  var x = (new Random()).Next(list.Count);');
        func.push('  return list[x];');
        func.push('});');
        Blockly.CSharp.definitions_['math_random_item'] = func.join('\n');
      }
      list = Blockly.CSharp.valueToCode(this, 'LIST',
          Blockly.CSharp.ORDER_NONE) || 'new List<dynamic>()';
      code = Blockly.CSharp.math_on_list.math_random_item +
          '(' + list + ')';
      break;
    default:
      throw 'Unknown operator: ' + func;
  }
  return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
};

Blockly.CSharp.math_modulo = function() {
  // Remainder computation.
  var argument0 = Blockly.CSharp.valueToCode(this, 'DIVIDEND',
      Blockly.CSharp.ORDER_MODULUS) || '0.0';
  var argument1 = Blockly.CSharp.valueToCode(this, 'DIVISOR',
      Blockly.CSharp.ORDER_MODULUS) || '0.0';
  var code = argument0 + ' % ' + argument1;
  return [code, Blockly.CSharp.ORDER_MODULUS];
};

Blockly.CSharp.math_constrain = function() {
  // Constrain a number between two limits.
  var argument0 = Blockly.CSharp.valueToCode(this, 'VALUE',
      Blockly.CSharp.ORDER_COMMA) || '0.0';
  var argument1 = Blockly.CSharp.valueToCode(this, 'LOW',
      Blockly.CSharp.ORDER_COMMA) || '0.0';
  var argument2 = Blockly.CSharp.valueToCode(this, 'HIGH',
      Blockly.CSharp.ORDER_COMMA) || 'double.PositiveInfinity';
  var code = 'Math.Min(Math.Max(' + argument0 + ', ' + argument1 + '), ' +
      argument2 + ')';
  return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
};

Blockly.CSharp.math_random_int = function() {
  // Random integer between [X] and [Y].
  var argument0 = Blockly.CSharp.valueToCode(this, 'FROM',
      Blockly.CSharp.ORDER_COMMA) || '0.0';
  var argument1 = Blockly.CSharp.valueToCode(this, 'TO',
      Blockly.CSharp.ORDER_COMMA) || '0.0';
  if (!Blockly.CSharp.definitions_['math_random_int']) {
    var functionName = Blockly.CSharp.variableDB_.getDistinctName(
        'math_random_int', Blockly.Generator.NAME_TYPE);
    Blockly.CSharp.math_random_int.random_function = functionName;
    var func = [];
    func.push('var ' + functionName + ' new Func<int,int,int>((a, b) => {');
    func.push('  if (a > b) {');
    func.push('    // Swap a and b to ensure a is smaller.');
    func.push('    var c = a;');
    func.push('    a = b;');
    func.push('    b = c;');
    func.push('  }');
    func.push('  return (int)Math.Floor(a + (new Random()).Next(b - a));');
    func.push('});');
    Blockly.CSharp.definitions_['math_random_int'] = func.join('\n');
  }
  var code = Blockly.CSharp.math_random_int.random_function +
      '(' + argument0 + ', ' + argument1 + ')';
  return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
};

Blockly.CSharp.math_random_float = function() {
  // Random fraction between 0 and 1.
  return ['(new Random()).NextDouble()', Blockly.CSharp.ORDER_FUNCTION_CALL];
};


Blockly.CSharp.procedures = {};

Blockly.CSharp.procedures_defreturn = function() {
  // Define a procedure with a return value.
  var funcName = Blockly.CSharp.variableDB_.getName(
      this.getTitleValue('NAME'), Blockly.Procedures.NAME_TYPE);
  var branch = Blockly.CSharp.statementToCode(this, 'STACK');

  if (Blockly.CSharp.INFINITE_LOOP_TRAP) {
    branch = Blockly.CSharp.INFINITE_LOOP_TRAP.replace(/%1/g,
        '\'' + this.id + '\'') + branch;
  }

  var returnValue = Blockly.CSharp.valueToCode(this, 'RETURN', Blockly.CSharp.ORDER_NONE) || '';
  if (returnValue) {
    returnValue = '  return ' + returnValue + ';\n';
  }

  var args = [];
  for (var x = 0; x < this.arguments_.length; x++) {
    args[x] = Blockly.CSharp.variableDB_.getName(this.arguments_[x],
        Blockly.Variables.NAME_TYPE);
  }

  var append_to_list = function (res, val) {
      if (res.length == 0)
          argTypes = val;
      else
          argTypes += ', ' + val;
  };

  var argTypes = '';
  for (var x = 0; x < args.length; x++) {
      append_to_list(argTypes, 'dynamic');
  }

  if (returnValue.length != 0) {
      append_to_list(argTypes, 'dynamic');
  }

  var delegateType = (returnValue.length == 0) ? 'Action' : ('Func<' + argTypes + '>');

  var code = 'var ' + funcName + ' = new ' + delegateType + '((' + args.join(', ') + ') => {\n' + branch + returnValue + '});';
  code = Blockly.CSharp.scrub_(this, code);
  Blockly.CSharp.definitions_[funcName] = code;
  return null;
};

// Defining a procedure without a return value uses the same generator as
// a procedure with a return value.
Blockly.CSharp.procedures_defnoreturn =
    Blockly.CSharp.procedures_defreturn;

Blockly.CSharp.procedures_callreturn = function() {
  // Call a procedure with a return value.
  var funcName = Blockly.CSharp.variableDB_.getName(
      this.getTitleValue('NAME'), Blockly.Procedures.NAME_TYPE);
  var args = [];
  for (var x = 0; x < this.arguments_.length; x++) {
    args[x] = Blockly.CSharp.valueToCode(this, 'ARG' + x,
        Blockly.CSharp.ORDER_COMMA) || 'null';
  }
  var code = funcName + '(' + args.join(', ') + ')';
  return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
};

Blockly.CSharp.procedures_callnoreturn = function() {
  // Call a procedure with no return value.
  var funcName = Blockly.CSharp.variableDB_.getName(
      this.getTitleValue('NAME'), Blockly.Procedures.NAME_TYPE);
  var args = [];
  for (var x = 0; x < this.arguments_.length; x++) {
    args[x] = Blockly.CSharp.valueToCode(this, 'ARG' + x, Blockly.CSharp.ORDER_COMMA) || 'null';
  }
  var code = funcName + '(' + args.join(', ') + ');\n';
  return code;
};

Blockly.CSharp.procedures_ifreturn = function() {
  // Conditionally return value from a procedure.
  var condition = Blockly.CSharp.valueToCode(this, 'CONDITION', Blockly.CSharp.ORDER_NONE) || 'false';
  var code = 'if (' + condition + ') {\n';
  if (this.hasReturnValue_) {
    var value = Blockly.CSharp.valueToCode(this, 'VALUE', Blockly.CSharp.ORDER_NONE) || 'null';
    code += '  return ' + value + ';\n';
  } else {
    code += '  return;\n';
  }
  code += '}\n';
  return code;
};

Blockly.CSharp.control = {};

Blockly.CSharp.controls_repeat = function() {
  // Repeat n times (internal number).
  var repeats = Number(this.getTitleValue('TIMES'));
  var branch = Blockly.CSharp.statementToCode(this, 'DO');
  if (Blockly.CSharp.INFINITE_LOOP_TRAP) {
    branch = Blockly.CSharp.INFINITE_LOOP_TRAP.replace(/%1/g,
        '\'' + this.id + '\'') + branch;
  }
  var loopVar = Blockly.CSharp.variableDB_.getDistinctName(
      'count', Blockly.Variables.NAME_TYPE);
  var code = 'for (var ' + loopVar + ' = 0; ' +
      loopVar + ' < ' + repeats + '; ' +
      loopVar + '++) {\n' +
      branch + '}\n';
  return code;
};

Blockly.CSharp.controls_repeat_ext = function() {
  // Repeat n times (external number).
  var repeats = Blockly.CSharp.valueToCode(this, 'TIMES',
      Blockly.CSharp.ORDER_ASSIGNMENT) || '0';
  var branch = Blockly.CSharp.statementToCode(this, 'DO');
  if (Blockly.CSharp.INFINITE_LOOP_TRAP) {
    branch = Blockly.CSharp.INFINITE_LOOP_TRAP.replace(/%1/g,
        '\'' + this.id + '\'') + branch;
  }
  var code = '';
  var loopVar = Blockly.CSharp.variableDB_.getDistinctName(
      'count', Blockly.Variables.NAME_TYPE);
  var endVar = repeats;
  if (!repeats.match(/^\w+$/) && !Blockly.isNumber(repeats)) {
    var endVar = Blockly.CSharp.variableDB_.getDistinctName(
        'repeat_end', Blockly.Variables.NAME_TYPE);
    code += 'var ' + endVar + ' = ' + repeats + ';\n';
  }
  code += 'for (var ' + loopVar + ' = 0; ' +
      loopVar + ' < ' + endVar + '; ' +
      loopVar + '++) {\n' +
      branch + '}\n';
  return code;
};

Blockly.CSharp.controls_whileUntil = function() {
  // Do while/until loop.
  var until = this.getTitleValue('MODE') == 'UNTIL';
  var argument0 = Blockly.CSharp.valueToCode(this, 'BOOL',
      until ? Blockly.CSharp.ORDER_LOGICAL_NOT :
      Blockly.CSharp.ORDER_NONE) || 'false';
  var branch = Blockly.CSharp.statementToCode(this, 'DO');
  if (Blockly.CSharp.INFINITE_LOOP_TRAP) {
    branch = Blockly.CSharp.INFINITE_LOOP_TRAP.replace(/%1/g,
        '\'' + this.id + '\'') + branch;
  }
  if (until) {
    argument0 = '!' + argument0;
  }
  return 'while (' + argument0 + ') {\n' + branch + '}\n';
};

Blockly.CSharp.controls_for = function() {
  // For loop.
  var variable0 = Blockly.CSharp.variableDB_.getName(
      this.getTitleValue('VAR'), Blockly.Variables.NAME_TYPE);
  var argument0 = Blockly.CSharp.valueToCode(this, 'FROM',
      Blockly.CSharp.ORDER_ASSIGNMENT) || '0';
  var argument1 = Blockly.CSharp.valueToCode(this, 'TO',
      Blockly.CSharp.ORDER_ASSIGNMENT) || '0';
  var increment = Blockly.CSharp.valueToCode(this, 'BY',
      Blockly.CSharp.ORDER_ASSIGNMENT) || '1';
  var branch = Blockly.CSharp.statementToCode(this, 'DO');
  if (Blockly.CSharp.INFINITE_LOOP_TRAP) {
    branch = Blockly.CSharp.INFINITE_LOOP_TRAP.replace(/%1/g,
        '\'' + this.id + '\'') + branch;
  }
  var code;
  if (Blockly.isNumber(argument0) && Blockly.isNumber(argument1) &&
      Blockly.isNumber(increment)) {
    // All arguments are simple numbers.
    var up = parseFloat(argument0) <= parseFloat(argument1);
    code = 'for (' + variable0 + ' = ' + argument0 + '; ' +
        variable0 + (up ? ' <= ' : ' >= ') + argument1 + '; ' +
        variable0;
    var step = Math.abs(parseFloat(increment));
    if (step == 1) {
      code += up ? '++' : '--';
    } else {
      code += (up ? ' += ' : ' -= ') + step;
    }
    code += ') {\n' + branch + '}\n';
  } else {
    code = '';
    // Cache non-trivial values to variables to prevent repeated look-ups.
    var startVar = argument0;
    if (!argument0.match(/^\w+$/) && !Blockly.isNumber(argument0)) {
      var startVar = Blockly.CSharp.variableDB_.getDistinctName(
          variable0 + '_start', Blockly.Variables.NAME_TYPE);
      code += 'var ' + startVar + ' = ' + argument0 + ';\n';
    }
    var endVar = argument1;
    if (!argument1.match(/^\w+$/) && !Blockly.isNumber(argument1)) {
      var endVar = Blockly.CSharp.variableDB_.getDistinctName(
          variable0 + '_end', Blockly.Variables.NAME_TYPE);
      code += 'var ' + endVar + ' = ' + argument1 + ';\n';
    }
    // Determine loop direction at start, in case one of the bounds
    // changes during loop execution.
    var incVar = Blockly.CSharp.variableDB_.getDistinctName(
        variable0 + '_inc', Blockly.Variables.NAME_TYPE);
    code += 'var ' + incVar + ' = ';
    if (Blockly.isNumber(increment)) {
      code += Math.abs(increment) + ';\n';
    } else {
      code += 'Math.Abs(' + increment + ');\n';
    }
    code += 'if (' + startVar + ' > ' + endVar + ') {\n';
    code += '  ' + incVar + ' = -' + incVar +';\n';
    code += '}\n';
    code += 'for (' + variable0 + ' = ' + startVar + ';\n' +
        '     '  + incVar + ' >= 0 ? ' +
        variable0 + ' <= ' + endVar + ' : ' +
        variable0 + ' >= ' + endVar + ';\n' +
        '     ' + variable0 + ' += ' + incVar + ') {\n' +
        branch + '}\n';
  }
  return code;
};

Blockly.CSharp.controls_forEach = function() {
  // For each loop.
  var variable0 = Blockly.CSharp.variableDB_.getName(
      this.getTitleValue('VAR'), Blockly.Variables.NAME_TYPE);
  var argument0 = Blockly.CSharp.valueToCode(this, 'LIST',
      Blockly.CSharp.ORDER_ASSIGNMENT) || '[]';
  var branch = Blockly.CSharp.statementToCode(this, 'DO');
  if (Blockly.CSharp.INFINITE_LOOP_TRAP) {
    branch = Blockly.CSharp.INFINITE_LOOP_TRAP.replace(/%1/g,
        '\'' + this.id + '\'') + branch;
  }
  var code;
  var indexVar = Blockly.CSharp.variableDB_.getDistinctName(
      variable0 + '_index', Blockly.Variables.NAME_TYPE);
  if (argument0.match(/^\w+$/)) {
    code = 'foreach (var ' + variable0 + ' in  ' + argument0 + ') {\n' + branch + '}\n';
  } else {
    // The list appears to be more complicated than a simple variable.
    // Cache it to a variable to prevent repeated look-ups.
    var listVar = Blockly.CSharp.variableDB_.getDistinctName(
        variable0 + '_list', Blockly.Variables.NAME_TYPE);
    branch = '  ' + variable0 + ' = ' + listVar + '[' + indexVar + '];\n' +
        branch;
    code = 'var ' + listVar + ' = ' + argument0 + ';\n' +
        'foreach (var ' + indexVar + ' in ' + listVar + ') {\n' +
        branch + '}\n';
  }
  return code;
};

Blockly.CSharp.controls_flow_statements = function() {
  // Flow statements: continue, break.
  switch (this.getTitleValue('FLOW')) {
    case 'BREAK':
      return 'break;\n';
    case 'CONTINUE':
      return 'continue;\n';
  }
  throw 'Unknown flow statement.';
};

Blockly.CSharp.logic = {};

Blockly.CSharp.controls_if = function() {
  // If/elseif/else condition.
  var n = 0;
  var argument = Blockly.CSharp.valueToCode(this, 'IF' + n,
      Blockly.CSharp.ORDER_NONE) || 'false';
  var branch = Blockly.CSharp.statementToCode(this, 'DO' + n);
  var code = 'if (' + argument + ') {\n' + branch + '}';
  for (n = 1; n <= this.elseifCount_; n++) {
    argument = Blockly.CSharp.valueToCode(this, 'IF' + n,
        Blockly.CSharp.ORDER_NONE) || 'false';
    branch = Blockly.CSharp.statementToCode(this, 'DO' + n);
    code += ' else if (' + argument + ') {\n' + branch + '}\n';
  }
  if (this.elseCount_) {
    branch = Blockly.CSharp.statementToCode(this, 'ELSE');
    code += ' else {\n' + branch + '}\n';
  }
  return code + '\n';
};

Blockly.CSharp.logic_compare = function() {
  // Comparison operator.
  var mode = this.getTitleValue('OP');
  var operator = Blockly.CSharp.logic_compare.OPERATORS[mode];
  var order = (operator == '==' || operator == '!=') ?
      Blockly.CSharp.ORDER_EQUALITY : Blockly.CSharp.ORDER_RELATIONAL;
  var argument0 = Blockly.CSharp.valueToCode(this, 'A', order) || 'null';
  var argument1 = Blockly.CSharp.valueToCode(this, 'B', order) || 'null';
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.CSharp.logic_compare.OPERATORS = {
  EQ: '==',
  NEQ: '!=',
  LT: '<',
  LTE: '<=',
  GT: '>',
  GTE: '>='
};

Blockly.CSharp.logic_operation = function() {
  // Operations 'and', 'or'.
  var operator = (this.getTitleValue('OP') == 'AND') ? '&&' : '||';
  var order = (operator == '&&') ? Blockly.CSharp.ORDER_LOGICAL_AND :
      Blockly.CSharp.ORDER_LOGICAL_OR;
  var argument0 = Blockly.CSharp.valueToCode(this, 'A', order) || 'false';
  var argument1 = Blockly.CSharp.valueToCode(this, 'B', order) || 'false';
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.CSharp.logic_negate = function() {
  // Negation.
  var order = Blockly.CSharp.ORDER_LOGICAL_NOT;
  var argument0 = Blockly.CSharp.valueToCode(this, 'BOOL', order) ||
      'false';
  var code = '!' + argument0;
  return [code, order];
};

Blockly.CSharp.logic_boolean = function() {
  // Boolean values true and false.
  var code = (this.getTitleValue('BOOL') == 'TRUE') ? 'true' : 'false';
  return [code, Blockly.CSharp.ORDER_ATOMIC];
};

Blockly.CSharp.logic_null = function() {
  // Null data type.
  return ['null', Blockly.CSharp.ORDER_ATOMIC];
};

Blockly.CSharp.logic_ternary = function() {
  // Ternary operator.
  var value_if = Blockly.CSharp.valueToCode(this, 'IF',
      Blockly.CSharp.ORDER_CONDITIONAL) || 'false';
  var value_then = Blockly.CSharp.valueToCode(this, 'THEN',
      Blockly.CSharp.ORDER_CONDITIONAL) || 'null';
  var value_else = Blockly.CSharp.valueToCode(this, 'ELSE',
      Blockly.CSharp.ORDER_CONDITIONAL) || 'null';
  var code = value_if + ' ? ' + value_then + ' : ' + value_else
  return [code, Blockly.CSharp.ORDER_CONDITIONAL];
};

Blockly.CSharp.lists = {}

Blockly.CSharp.lists_create_empty = function() {
  return ['null', Blockly.CSharp.ORDER_ATOMIC];
};

Blockly.CSharp.lists_create_with = function() {
  // Create a list with any number of elements of any type.
  var code = new Array(this.itemCount_);
  for (var n = 0; n < this.itemCount_; n++) {
    code[n] = Blockly.CSharp.valueToCode(this, 'ADD' + n,
        Blockly.CSharp.ORDER_COMMA) || 'null';
  }
  code = 'new List<dynamic> {' + code.join(', ') + '}';
  return [code, Blockly.CSharp.ORDER_ATOMIC];
};

Blockly.CSharp.lists_repeat = function() {
  // Create a list with one element repeated.
  if (!Blockly.CSharp.definitions_['lists_repeat']) {
    // Function copied from Closure's goog.array.repeat.
    var functionName = Blockly.CSharp.variableDB_.getDistinctName(
        'lists_repeat', Blockly.Generator.NAME_TYPE);
    Blockly.CSharp.lists_repeat.repeat = functionName;
    var func = [];
    func.push('var ' + functionName + ' = new Func<dynamic, dynamic, List<dynamic>>((value, n) => {');
    func.push('  var array = new List<dynamic>(n);');
    func.push('  for (var i = 0; i < n; i++) {');
    func.push('    array.Add(value);');
    func.push('  }');
    func.push('  return array;');
    func.push('});');
    Blockly.CSharp.definitions_['lists_repeat'] = func.join('\n');
  }
  var argument0 = Blockly.CSharp.valueToCode(this, 'ITEM',
      Blockly.CSharp.ORDER_COMMA) || 'null';
  var argument1 = Blockly.CSharp.valueToCode(this, 'NUM',
      Blockly.CSharp.ORDER_COMMA) || '0';
  var code = Blockly.CSharp.lists_repeat.repeat +
      '(' + argument0 + ', ' + argument1 + ')';
  return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
};

Blockly.CSharp.lists_length = function() {
  // List length.
  var argument0 = Blockly.CSharp.valueToCode(this, 'VALUE', Blockly.CSharp.ORDER_FUNCTION_CALL) || 'null';
  return [argument0 + '.Count', Blockly.CSharp.ORDER_MEMBER];
};

Blockly.CSharp.lists_isEmpty = function() {
  // Is the list empty?
  var argument0 = Blockly.CSharp.valueToCode(this, 'VALUE',
      Blockly.CSharp.ORDER_MEMBER) || 'null';
  return [argument0 + '.Count == 0', Blockly.CSharp.ORDER_LOGICAL_NOT];
};

Blockly.CSharp.lists_indexOf = function() {
  // Find an item in the list.
  var operator = this.getTitleValue('END') == 'FIRST' ?
      'IndexOf' : 'LastIndexOf';
  var argument0 = Blockly.CSharp.valueToCode(this, 'FIND',
      Blockly.CSharp.ORDER_NONE) || 'null';
  var argument1 = Blockly.CSharp.valueToCode(this, 'VALUE',
      Blockly.CSharp.ORDER_MEMBER) || 'null';
  var code = argument1 + '.' + operator + '(' + argument0 + ') + 1';
  return [code, Blockly.CSharp.ORDER_MEMBER];
};

Blockly.CSharp.lists_getIndex = function() {
  var mode = this.getTitleValue('MODE') || 'GET';
  var where = this.getTitleValue('WHERE') || 'FROM_START';
  var at = Blockly.CSharp.valueToCode(this, 'AT',
      Blockly.CSharp.ORDER_UNARY_NEGATION) || '1';
  var list = Blockly.CSharp.valueToCode(this, 'VALUE',
      Blockly.CSharp.ORDER_MEMBER) || 'null';

  if (mode == 'GET_REMOVE') {
      if (where == 'FIRST') {
          at = 1;
      }
      else if (where == 'LAST') {
          at = list + '.Count - 1';
      }
      else {
          // Blockly uses one-based indicies.
          if (Blockly.isNumber(at)) {
              // If the index is a naked number, decrement it right now.
              at = parseFloat(at) - 1;
          } else {
              // If the index is expression, decrement it in code.
              at = '(' + at + ' - 1)';
          }
      }

      if (where == 'FROM_END') {
          at = '(' + list + '.Count) - ' + (at + 1);
      }

    if (!Blockly.CSharp.definitions_['lists_get_remove_at']) {
    var functionName = Blockly.CSharp.variableDB_.getDistinctName(
        'lists_get_remove_at', Blockly.Generator.NAME_TYPE);
    Blockly.CSharp.lists_getIndex.lists_get_remove_at = functionName;
    var func = [];
    func.push('var ' + functionName + ' = new Func<List<dynamic>, int, dynamic>((list, index) => {');
    func.push('  var res = list[index];');
    func.push('  list.RemoveAt(index);');
    func.push('  return res;');
    func.push('});');
    Blockly.CSharp.definitions_['lists_get_remove_at'] =
        func.join('\n');
    }
    code = Blockly.CSharp.lists_getIndex.lists_get_remove_at +
        '(' + list + ', ' + at + ')';
    return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
  }

  if (where == 'FIRST') {
    if (mode == 'GET') {
      var code = list + '.First()';
      return [code, Blockly.CSharp.ORDER_MEMBER];
    } else if (mode == 'REMOVE') {
      return list + '.RemoveAt(0);\n';
    }
  } else if (where == 'LAST') {
    if (mode == 'GET') {
      var code = list + '.Last()';
      return [code, Blockly.CSharp.ORDER_MEMBER];
    } else if (mode == 'REMOVE') {
    return list + '.RemoveAt(' + list + '.Count - 1);\n';
    }
  } else if (where == 'FROM_START') {
    if (mode == 'GET') {
      var code = list + '[' + at + ']';
      return [code, Blockly.CSharp.ORDER_MEMBER];
    } else if (mode == 'REMOVE') {
      return list + '.RemoveAt(' + at + ');\n';
    }
  } else if (where == 'FROM_END') {
      if (mode == 'GET') {
          var code = list + '[list.Count - ' + at + ']';
          return [code, Blockly.CSharp.ORDER_MEMBER];
      } else if (mode == 'REMOVE') {
          return list + '.RemoveAt(list.Count - ' + at + ');\n';
      }
  } else if (where == 'RANDOM') {
    if (!Blockly.CSharp.definitions_['lists_get_random_item']) {
      var functionName = Blockly.CSharp.variableDB_.getDistinctName(
          'lists_get_random_item', Blockly.Generator.NAME_TYPE);
      Blockly.CSharp.lists_getIndex.random = functionName;
      var func = [];
      func.push('var ' + functionName + ' = new Func<List<dynamic>, bool, dynamic>((list, remove) => {');
      func.push('  var x = (new Random()).Next(list.Count);');
      func.push('  if (remove) {');
      func.push('    var res = list[x];');
      func.push('    list.RemoveAt(x);');
      func.push('    return res;');
      func.push('  } else {');
      func.push('    return list[x];');
      func.push('  }');
      func.push('});');
      Blockly.CSharp.definitions_['lists_get_random_item'] =
          func.join('\n');
    }
    code = Blockly.CSharp.lists_getIndex.random +
        '(' + list + ', ' + (mode != 'GET') + ')';
    if (mode == 'GET') {
      return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
    } else if (mode == 'REMOVE') {
      return code + ';\n';
    }
  }
  throw 'Unhandled combination (lists_getIndex).';
};

Blockly.CSharp.lists_setIndex = function() {
  // Set element at index.
  var list = Blockly.CSharp.valueToCode(this, 'LIST',
      Blockly.CSharp.ORDER_MEMBER) || 'null';
  var mode = this.getTitleValue('MODE') || 'GET';
  var where = this.getTitleValue('WHERE') || 'FROM_START';
  var at = Blockly.CSharp.valueToCode(this, 'AT',
      Blockly.CSharp.ORDER_NONE) || '1';
  var value = Blockly.CSharp.valueToCode(this, 'TO',
      Blockly.CSharp.ORDER_ASSIGNMENT) || 'null';

  if (where == 'FIRST') {
    if (mode == 'SET') {
      return list + '[0] = ' + value + ';\n';
    } else if (mode == 'INSERT') {
      return list + '.Insert(0, ' + value + ');\n';
    }
  } else if (where == 'LAST') {
    if (mode == 'SET') {
      var code = list + '[' + list + '.Count - 1] = ' + value + ';\n';
      return code;
    } else if (mode == 'INSERT') {
      return list + '.Add(' + value + ');\n';
    }
  } else if (where == 'FROM_START') {
    // Blockly uses one-based indicies.
    if (Blockly.isNumber(at)) {
      // If the index is a naked number, decrement it right now.
      at = parseFloat(at) - 1;
    } else {
      // If the index is dynamic, decrement it in code.
        at = '(' + list + '.Count) - ' + (at + 1);
    }
    if (mode == 'SET') {
      return list + '[' + at + '] = ' + value + ';\n';
    } else if (mode == 'INSERT') {
      return list + '.Insert(' + at + ', ' + value + ');\n';
    }
  } else if (where == 'FROM_END') {
    if (mode == 'SET') {
      var code = list + '[' + list + '.Count - ' + at + '] = ' + value + ';\n';
      return code;
    } else if (mode == 'INSERT') {
      var code = list + '.Insert(' + list + '.Count - ' + at + ', ' + value + ');\n';
      return code;
    }
  } else if (where == 'RANDOM') {
    var xVar = Blockly.CSharp.variableDB_.getDistinctName(
        'tmp_x', Blockly.Variables.NAME_TYPE);
    var code = 'var ' + xVar + ' = (new Random()).Next(' + list + '.Count);\n';
    if (mode == 'SET') {
      var code = list + '[' + xVar + '] = ' + value + ';\n';
      return code;
    } else if (mode == 'INSERT') {
        var code = list + '.Insert(' + xVar + ', ' + value + ');\n';
      return code;
    }
  }
  throw 'Unhandled combination (lists_setIndex).';
};

Blockly.CSharp.lists_getSublist = function() {
  // Get sublist.
  var list = Blockly.CSharp.valueToCode(this, 'LIST',
      Blockly.CSharp.ORDER_MEMBER) || 'null';
  var where1 = this.getTitleValue('WHERE1');
  var where2 = this.getTitleValue('WHERE2');
  var at1 = Blockly.CSharp.valueToCode(this, 'AT1',
      Blockly.CSharp.ORDER_NONE) || '1';
  var at2 = Blockly.CSharp.valueToCode(this, 'AT2',
      Blockly.CSharp.ORDER_NONE) || '1';
  if (where1 == 'FIRST' && where2 == 'LAST') {
    var code = 'new List<dynamic>(' + list + ')';
  } else {
    if (!Blockly.CSharp.definitions_['lists_get_sublist']) {
      var functionName = Blockly.CSharp.variableDB_.getDistinctName(
          'lists_get_sublist', Blockly.Generator.NAME_TYPE);
      Blockly.CSharp.lists_getSublist.func = functionName;
      var func = [];
      func.push('var ' + functionName + ' = new Func<List<dynamic>, dynamic, int, dynamic, int, List<dynamic>>((list, where1, at1, where2, at2) => {');
      func.push('  var getIndex = new Func<dynamic, int, int>((where, at) => {');
      func.push('    if (where == "FROM_START") {');
      func.push('      at--;');
      func.push('    } else if (where == "FROM_END") {');
      func.push('      at = list.Count - at;');
      func.push('    } else if (where == "FIRST") {');
      func.push('      at = 0;');
      func.push('    } else if (where == "LAST") {');
      func.push('      at = list.Count - 1;');
      func.push('    } else {');
      func.push('      throw new ApplicationException("Unhandled option (lists_getSublist).");');
      func.push('    }');
      func.push('    return at;');
      func.push('  });');
      func.push('  at1 = getIndex(where1, at1);');
      func.push('  at2 = getIndex(where2, at2);');
      func.push('  return list.GetRange(at1, at2 - at1 + 1);');
      func.push('});');
      Blockly.CSharp.definitions_['lists_get_sublist'] =
          func.join('\n');
    }
    var code = Blockly.CSharp.lists_getSublist.func + '(' + list + ', "' +
        where1 + '", ' + at1 + ', "' + where2 + '", ' + at2 + ')';
  }
  return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
};


Blockly.CSharp.colour = {};

Blockly.CSharp.colour_picker = function() {
  // Colour picker.
    var code = 'ColorTranslator.FromHtml("' + this.getTitleValue('COLOUR') + '")';
  return [code, Blockly.CSharp.ORDER_ATOMIC];
};

Blockly.CSharp.colour_random = function() {
  // Generate a random colour.
  if (!Blockly.CSharp.definitions_['colour_random']) {
    var functionName = Blockly.CSharp.variableDB_.getDistinctName(
        'colour_random', Blockly.Generator.NAME_TYPE);
    Blockly.CSharp.colour_random.functionName = functionName;
    var func = [];
    func.push('var ' + functionName + ' = new Func<Color>(() => {');
    func.push('  var random = new Random();');
    func.push('  var res = Color.FromArgb(1, random.Next(256), random.Next(256), random.Next(256));');
    func.push('  return res;');
    func.push('});');
    Blockly.CSharp.definitions_['colour_random'] = func.join('\n');
  }
  var code = Blockly.CSharp.colour_random.functionName + '()';
  return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
};

Blockly.CSharp.colour_rgb = function() {
  // Compose a colour from RGB components expressed as percentages.
  var red = Blockly.CSharp.valueToCode(this, 'RED',
      Blockly.CSharp.ORDER_COMMA) || 0;
  var green = Blockly.CSharp.valueToCode(this, 'GREEN',
      Blockly.CSharp.ORDER_COMMA) || 0;
  var blue = Blockly.CSharp.valueToCode(this, 'BLUE',
      Blockly.CSharp.ORDER_COMMA) || 0;

  if (!Blockly.CSharp.definitions_['colour_rgb']) {
    var functionName = Blockly.CSharp.variableDB_.getDistinctName(
        'colour_rgb', Blockly.Generator.NAME_TYPE);
    Blockly.CSharp.colour_rgb.functionName = functionName;
    var func = [];
    func.push('var ' + functionName + ' = new Func<dynamic, dynamic, dynamic, Color>((r, g, b) => {');
    func.push('  r = (int)Math.Round(Math.Max(Math.Min((int)r, 100), 0) * 2.55);');
    func.push('  g = (int)Math.Round(Math.Max(Math.Min((int)g, 100), 0) * 2.55);');
    func.push('  b = (int)Math.Round(Math.Max(Math.Min((int)b, 100), 0) * 2.55);');
    func.push('  var res = Color.FromArgb(1, r, g, b);');
    func.push('  return res;');
    func.push('});');
    Blockly.CSharp.definitions_['colour_rgb'] = func.join('\n');
  }
  var code = Blockly.CSharp.colour_rgb.functionName +
      '(' + red + ', ' + green + ', ' + blue + ')';
  return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
};

Blockly.CSharp.colour_blend = function() {
  // Blend two colours together.
  var c1 = Blockly.CSharp.valueToCode(this, 'COLOUR1',
      Blockly.CSharp.ORDER_COMMA) || 'Color.Black';
  var c2 = Blockly.CSharp.valueToCode(this, 'COLOUR2',
      Blockly.CSharp.ORDER_COMMA) || 'Color.Black';
  var ratio = Blockly.CSharp.valueToCode(this, 'RATIO',
      Blockly.CSharp.ORDER_COMMA) || 0.5;

  if (!Blockly.CSharp.definitions_['colour_blend']) {
    var functionName = Blockly.CSharp.variableDB_.getDistinctName(
        'colour_blend', Blockly.Generator.NAME_TYPE);
    Blockly.CSharp.colour_blend.functionName = functionName;
    var func = [];
    func.push('var ' + functionName + ' = new Func<Color, Color, double, Color>((c1, c2, ratio) => {');
    func.push('  ratio = Math.Max(Math.Min((double)ratio, 1), 0);');
    func.push('  var r = (int)Math.Round(c1.R * (1 - ratio) + c2.R * ratio);');
    func.push('  var g = (int)Math.Round(c1.G * (1 - ratio) + c2.G * ratio);');
    func.push('  var b = (int)Math.Round(c1.B * (1 - ratio) + c2.B * ratio);');
    func.push('  var res = Color.FromArgb(1, r, g, b);');
    func.push('  return res;');
    func.push('});');
    Blockly.CSharp.definitions_['colour_blend'] = func.join('\n');
  }
  var code = Blockly.CSharp.colour_blend.functionName +
      '(' + c1 + ', ' + c2 + ', ' + ratio + ')';
  return [code, Blockly.CSharp.ORDER_FUNCTION_CALL];
};