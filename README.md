# JDSL: JavaScript DOM Stylesheet Language

JDSL is a stylsheet language (much like XSLT) which leverages JSON in the browser to provide client-side template rendering. The purpose of the language is to make transforming JSON responses from AJAX transactions easy to insert into a HTML page.

## Project Details

### Licence

Copyright (C) 2012, "Bashkim Isai":http://www.bashkim.com.au

This script is distributed under the MIT licence.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


### Contributors

* @bashaus

If you fork this project and create a pull request, don't forget to add your name to the end of list above. 

## Dependencies

JDSL does not require any external libraries to function.

Although the examples provided have a jQuery interface, it is not required in order to get JDSL to work.

## Compatibility

### Microsoft Internet Explorer

* Version 6: untested & unsupported
* Version 7: tested & failed
* Version 8: tested & passed
* Version 9: tested & passed

### Google Chrome

* Versions before 18: untested but should probably work in most versions
* Version 18: tested & passed

### Mozilla Firefox

* Versions before 10: untested but should probably work in most versions
* Version 10: tested & passed

## Examples

See examples/index.html for an example of how all JDSL elements function.

## JDSL Elements

### j:text

This element contains literal text. Information in the children will be outputted as-is. It's best to use this with a CDATA child.

Attributes:

* None

Example:

```xml
<j:stylesheet>
    <j:template id="main">
        <j:text>
            <![CDATA[
                Hello, Fred.
            ]]>
        </j:text>
    </j:template>
</j:stylesheet>
```

Outputs:
```html
Hello, Fred.
```



### j:value-of &amp; j:val

The value-of element is used to output a JavaScript or JSON variable. You can access the entire DOM from this element, or you can use a JavaScript object that you passed through. The elements j:value-of and j:val are synonymous.

Attributes:

* select - A selector which will evaluate to a string or number to be displayed to the browser.

Example:

```xml
<j:stylesheet>
    <j:template id="main">
        <j:val select="navigator.userAgent" />
    </j:template>
</j:stylesheet>
```



### j:variable

Declares a variable that can be used later as a shortcut to data. You can use the elements j:value-of and j:val to output a variable by preceeding the name of the variable with a dollar sign ($).

Attributes:

* name (string) - The name that you would like to name your variable.
* select (selector) - A selector which will evaluate to a string or number to be displayed to the browser.

Example:

Using JSON:
```javascript
{"name":"Fred"}
```

```xml
<j:stylesheet>
    <j:template id="main">
        <j:variable name="myVariable" select="this" />
        Hello, <j:val select="$myVariable" />.
    </j:template>
</j:stylesheet>
```

Outputs:
```html
Hello, Fred.
```

Variables have a strict context. When you create a new variable, it will be released at the end of the context.

Example:

```xml
<j:stylesheet>
    <j:template id="main">
        <div>
            <j:variable name="myName" select="this.name" />
            <j:val select="$myName" />
        </div>
        <!-- This will cause an error because it's out of scope. -->
        <!-- The variable $myName doesn't exist outside of the div element. -->
        <j:val select="$myName" />
    </j:template>
</j:stylesheet>
```



### j:template &amp; j:param

A j:stylesheet contains one or more j:templates which form the basis for transforming JSON data into DOM elements. You can choose any name for your templates, but it is recommended that you make the name of your templates unique to any other element in your current website which is identified by the same ID.

Attributes: j:template

* id (string) - The unique name of this template.

Example:

```xml
<j:stylesheet>
    <j:template id="main">
    </j:template>
</j:stylesheet>
```

Templates can have named parameters passed to them.

Attributes: j:param

* name (string) - The name of a parameter that is being expected.
* select (selector, optional) - The fallback to use if this parameter isn't passed through.

```xml
<j:stylesheet>
    <j:template id="main">
        <j:param name="number" />               <!-- Required parameter, if missing will throw an error -->
        <j:param name="shade" select="null" />  <!-- Optional parameter with a fallback of NULL -->
        <j:param name="color" select="'red'" /> <!-- Optional parameter with a fallback of "red" -->
        <j:param name="people" data-type="json">
            <![CDATA[
                {"Fred":{"said":"Right"}}
            ]]>
        </j:param><!-- Optional parameter with a fallback of a JavaScript object (parsed via JSON) -->
    </j:template>
</j:stylesheet>
```



### j:call-template -> j:with-param

Allows you to execute another template from inside another one. Both templates does not have to be in the same file. 

Attributes: j:call-template

* rel (string): The ID of the template you would like to call. Templates names in the rel attribute should be preceeded with the hash symbol (#).


You can pass parameters using j:with-param.

Attributes: j:with-param

* name (string): The named parameter being passed.
* select (selector): A JavaScript evaluation of the variable being passed. Can be literals (see example below).

```xml
<j:stylesheet>
    <j:template id="main">
        <j:call-template rel="#print-name">
            <j:with-param name="name" select="'Fred'" />
        </j:call-template>
    </j:template>
    <j:template id="print-name">
        <j:param name="name" />
        Hello, <j:val select="$name" />.
    </j:tempalte>
</j:stylesheet>
```

Outputs:
```html
Hello, Fred.
```



### j:if

Simple conditional testing to decide whether a block should or should not be shown. The return from the test should result in a Boolean (true/false). If you would like to simulate an if/else statement, see j:choose.

Attributes:

* test (boolean): A JavaScript evaluation which will return a boolean value to test a guard.

Using JSON:
```javascript
{"visible":true}
```

Using JDSL:
```xml
<j:stylesheet>
    <j:template id="main">
        <j:if test="this.visible">
            <p>This is visible.</p>
        </j:if>
        <j:if test="!this.visible">
            <p>This is not visible.</p>
        </j:if>
    </j:template>
</j:stylesheet>
```

Outputs:
```html
<p>This is visible.</p>
```



### j:choose -> j:case

Similar to the function of j:if, but allows you to do an if/elseif/else statement.

A j:choose element contains many j:case elements.

A j:case element contains an attribute called "test" which is what you're testing against. If you'd like a default/fallback in case a condition cannot be passed, omit the "test" attribute.

Attributes: j:choose

None

Attributes: j:case

* test (boolean): A JavaScript evaluation which will return a boolean value to test a guard.

Using JSON:
```javascript
{"magicNumber":24}
```

Using JDSL:
```xml
<j:stylesheet>
    <j:template id="main">
        <p>You guessed: <j:val select="this.magicNumber" />.</p>
        <j:choose>
            <j:case test="this.magicNumber < 10">
                <p>Your guess was too low.</p>
            </j:case>
            <j:case test="this.magicNumber == 10">
                <p>You guessed correctly.</p>
            </j:case>
            <j:case>
                <p>Your guess was too high.</p>
            </j:case>
        </j:choose>
    </j:template>
</j:stylesheet>
```

Outputs:
```html
<p>You guessed: 24.</p>
<p>Your guess was too high.</p>
```



### j:switch -> j:case

Conditional guard which evaluates a block depending on whether the select attribute of the "switch" matches the select attribute of a case. Use a case with no select attribute for a default value.

Attributes: j:switch

* select (selector): The variable that you are wishing to test against. An antecedent.

Attributes: j:case

* select (selector): The variable that you wish to branch on. A consequent.

Using JSON:
```javascript
{"name":"Fred"}
```

Using JDSL:
```xml
<j:stylesheet>
    <j:template id="main">
        <p>
            <j:switch select="this.name">
                <j:case select="'Fred'">
                    Hello, Fred!
                </j:case>
                <j:case>
                    You're not Fred.
                </j:case>
            </j:choose>
        </p>
    </j:template>
</j:stylesheet>
```

Outputs
```html
<p>Hello, Fred.</p>
```



### j:comment

Allows you to insert a comment into the DOM. While XML comments are passed through 

Attributes:

None

Using JSON:
```javascript
{"name":"Fred"}
```

Using JDSL:
```xml
<j:stylesheet>
    <j:template id="main">
        <j:comment>
            Hello, <j:val select="this.name" />.
        </j:comment>
    </j:template>
</j:stylesheet>
```

Outputs:
```html
<!-- Hello, Fred. -->
```



### j:element

Allows the dynamic creation of an element.

Attributes:

* name (string) : The tag name of the element you wish to create.

Using JDSL:
```xml
<j:stylesheet>
    <j:template id="main">
        <j:element name="span">
            Hello, Fred.
        </j:element>
    </j:template>
</j:stylesheet>
```

Outputs:
```html
<span>Hello, Fred.</span>
```



### j:attribute

Allows you to dynamically assign attributes to an element. Although the j:attribute option is available, a better approach is to use "Attribute shortcutting".

Attributes:

* name (string) : The tag name of the element you wish to create.
* select (string) : A JavaScript evaluation which will act as the value of the attribute.
* [childNodes] : If child nodes are present, the select attribute is ignored and the value from the child nodes are used.

Example:

Using JSON:
```javascript
{"element":"p"}
```

Using JDSL (select):
```xml
<j:stylesheet>
    <j:template id="main">
        <j:element>
            <j:attribute name="name" select="this.element" />
            Hello, Fred.
        </j:element>
    </j:template>
</j:stylesheet>
```

Using JDSL (child nodes):
```xml
<j:stylesheet>
    <j:template id="main">
        <j:element>
            <j:attribute name="name">
                <j:val select="this.element" />
            </j:attribute>
            Hello, Fred.
        </j:element>
    </j:template>
</j:stylesheet>
```

Both examples output:
```html
<p>Hello, Fred.</p>
```



### j:loop

A simple for-loop. Iterates over its child nodes for a pre-determined number of times.

Attributes:

* times (number) : The number of times to iterate.
* key (variable-name) : The name of the variable which you wish to store the number of the current iteration.

Using JDSL:
```xml
<j:stylesheet>
    <j:template id="main">
        <ul>
            <j:loop times="10" key="iteration">
                <li><j:val select="$iteration" /></li>
            </j:loop>
        </ul>
    </j:template>
</j:stylesheet>
```



### j:for-each

Iterates over an array.

Attributes:

* select (selector -> array) : A selector which evaluates to an array to iterate over.
* key (variable-name) : The name of the variable which you wish to store the key of the current iteration.
* value (variable-name) : The name of the variable which you wish to store the value of the current iteration.

Using JSON:
```javascript
["apples", "bananas", "carrots"]
```

Using JDSL:
```xml
<j:stylesheet>
    <j:template id="main">
        <ul>
            <j:for-each select="this" key="i" value="fruit">
                <li>
                    <j:val select="$i" />:
                    <j:val select="$fruit" />
                </li>
            </j:for-each>
        </ul>
    </j:template>
</j:stylesheet>
```



### j:sort

Is a child of j:for-each. Sorts an array before looping.

Attributes:

* select (selector -> array) : The element that you want to sort against. Default: currentNode (.).
* sort-type (dynamic enum) : The type of sort which you would like to sort against. Default types include: string, number.
* order (enum) : Either "ascending" or "descending". Default: ascending.

Notes:

Keep in mind, the value of "this" for the j:for-each element is relative to its parent (which is an array). The value of "this" for the j:sort element is a representation of a single element in the for-each statement.

Using JSON:
```javascript
["apples", "bananas", "carrots"]
```

Using JDSL:
```xml
<j:stylesheet>
    <j:template id="main">
        <ul>
            <j:for-each select="this" key="i" value="fruit">
                <j:sort select="this" sort-type="string" order="descending" />
                <li>
                    <j:val select="$i" />:
                    <j:val select="$fruit" />
                </li>
            </j:for-each>
        </ul>
    </j:template>
</j:stylesheet>
```



### j:message &amp; j:log

Allows for easy debugging of JDSL through the browser console. The elements j:message and j:log are synonymous.

Attributes:

* level (enum) : The severity of the message. Options: log, debug, info, warn, error. Default: log. Fallback: log.
* select (string) : A JavaScript evaluation which will act as the value of the attribute. Useful for debugging objects.
* [childNodes] : If child nodes are present, the select attribute is ignored and the value from the child nodes are used.

Example:

Using JSON:
```javascript
["apples", "bananas", "carrots"]
```

Using JDSL:
```xml
<j:stylesheet>
    <j:template id="main">
        <j:log>This is a log message</j:log>
        <j:log level="log">This is a log message</j:log>
        <j:log level="warn">This is a warn message</j:log>
        <j:log level="debug">This is a debug message</j:log>
        <j:log level="info">This is a info message</j:log>
        <j:log level="error">This is a error message</j:log>
        <j:log level="info" select="this" />
    </j:template>
</j:stylesheet>
```

Using JDSL:
```xml
<j:stylesheet>
    <j:template id="main">
        <j:log select="this" />
    </j:template>
</j:stylesheet>
```

### j:script

Executes a block of JavaScript. Gives you access to all variables and the current context.

Attributes:

None

Using JDSL:
```xml
<j:stylesheet>
    <j:template id="main">
        <j:script>
            <![CDATA[
                alert(this);
            ]]>
        </j:script>
    </j:template>
</j:stylesheet>
```

### j:fallback

Executed if its parent element is not valid.

Attributes:

None

Using JDSL:
```xml
<j:stylesheet>
    <j:template id="main">
        <j:unknown-element>
            <j:fallback>
                Please upgrade to a newer version of JDSL.
            </j:fallback>
        </j:unknown-element>
    </j:template>
</j:stylesheet>
```

## Advanced topics

### Attribute shortcutting

To quickly assign dynamic attributes to an element, you can use attribute shortcutting. This is available on all elements (HTML elements and JDSL elements).

Attribute shortcuts must begin and end with braces: {}. Shortcuts cannot appear in the middle of an attribute.

Using JSON:
```javascript
{"color":"#CC0000"}
```

This JDSL is valid (but doesn't work in some browsers):
```xml
<j:stylesheet>
    <j:template id="main">
        <font color="{this.color}">
            This sentence will be displayed in red.
        </font>
    </j:template>
</j:stylesheet>
```

This JDSL is invalid:
```xml
<j:stylesheet>
    <j:template id="main">
        <p style="color: {this.color}">
            This sentence will not be displayed in red.
        </p>
    </j:template>
</j:stylesheet>
```

As JDSL parses attribute shortcutting as literal JS, the following is valid:
```xml
<j:stylesheet>
    <j:template id="main">
        <p style="{'color:'+this.color}">
            This sentence will be displayed in red.
        </p>
    </j:template>
</j:stylesheet>
```