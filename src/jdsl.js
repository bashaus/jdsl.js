(function() {
    JDSL = function() {
        this.processContext = function(input, template, output) {
            // Parse j:attribute tags before processing the element
            var attributeNodes = JDSLFunction.nodeListFilter(template.childNodes, 'nodeName', JDSL.FILTER_INCLUDE, 'j:attribute');
            for (var i=0; i < attributeNodes.length; ++i) {
                this.parseAttributes(input, attributeNodes[i], template);
            }

            var nodeReference = JDSLFunction.nodeReference(template);
            if (nodeReference.namespace == 'j') {
                if (typeof JDSLElements.instruction[JDSLElements.elements[nodeReference.name]] === "function") {
                    JDSLElements.instruction[JDSLElements.elements[nodeReference.name]].call(this, input, template, output);
                } else {
                    // In this case, the JDSL element was not found.
                    // We will attempt to find a JDSL fallback
                    var fallbacks = JDSLFunction.nodeListFilter(template.childNodes, 'nodeName', JDSL.FILTER_INCLUDE, 'j:fallback');
                    if (fallbacks.length == 1) {
                        this.childNodes(input, fallbacks[0], output);
                    } else if (fallbacks.length > 1) {
                        throw new JDSL.ElementMalformedError(nodeReference.name);
                    } else {
                        throw new JDSL.ElementNotFoundError(nodeReference.name);
                    }
                }
            } else {
                this.passThrough(input, template, output);
            } 
        }
        
        this.variable = function(input, template) {
            var name = template.getAttribute('name');
            var select = template.getAttribute('select');
            var dataType = template.getAttribute('data-type') || JDSL.getDefaultDataType();
            var value = '';
            
            if (template.childNodes.length > 0) {
                node = template.ownerDocument.createDocumentFragment();
                this.childNodes(input, template, node);
                value = JDSLFunction.nodeToString(node);
            } else if (select) {
                value = this.variables.eval.call(input, select);
            }

            // Parse data types
            if (dataType) {
                value = JDSLDataTypes[dataType].call(this, value);
            }
            
            this.variables.set(name, value);

            return name;
        }
        
        // Traverses the template node tree. Calls the main processing
        // function with the current input context for every child node of the
        // current template node.
        
        this.childNodes = function(input, template, output) {
            this.variables.allocContext();

            var children = JDSLFunction.nodeListFilter(template.childNodes, 'nodeName', JDSL.FILTER_EXCLUDE, 'j:fallback');
            for (var i=0; i < children.length; ++i) {
                this.processContext(input, children[i], output);
            }

            this.variables.releaseContext();
        }
        
        // Passes template text to the output. The current template node does
        // not specify an XSL-T operation and therefore is appended to the
        // output with all its attributes. Then continues traversing the
        // template node tree.
        
        this.passThrough = function(input, template, output) {
            switch (template.nodeType) {
                case JDSL.DOM_NODE_COMMENT:
                    var node = output.ownerDocument.createComment(template.data);
                    output.appendChild(node);
                    break;

                case JDSL.DOM_NODE_TEXT:
                case JDSL.DOM_NODE_CDATA_SECTION:
                    if (this.passText(template)) {
                        var node = output.ownerDocument.createTextNode(template.nodeValue);
                        output.appendChild(node);
                    }
                    break;

                case JDSL.DOM_NODE_ELEMENT:
                    var node = document.createElement(template.nodeName);
                    for (var i=0; i < template.attributes.length; ++i) {
                        var a = template.attributes[i];
                        if (a) {
                            var name = a.nodeName;
                            var value = this.parseAttribute(a.nodeValue, input);
                            node.setAttribute(name, value);
                        }
                    }
                    output.appendChild(node);
                    this.childNodes(input, template, node);
                    break;

                default:
                    // This applies also to the DOCUMENT_NODE of the XSL stylesheet,
                    // so we don't have to treat it specially.
                    this.childNodes(input, template, output);
                    break;
            }
        }
        
        this.passText = function(template) {
            if (!template.nodeValue.match(/^\s*$/)) {
                return true;
            }
            
            var element = template.parentNode;
            if (JDSLFunction.isElement(element, 'j:text')) {
                return true;
            }
            
            return false;
        }
        
        this.parseAttribute = function(value, context) {
            if (!value) {
                return;
            }
            
            var processingInstruction = value.match(/^{(.*)}$/);
            if (!processingInstruction) {
                return value;
            }
            
            return this.variables.eval.call(context, processingInstruction[1]);
        }

        this.parseAttributes = function(input, template, output) {
            var name = this.parseAttribute(template.getAttribute('name'), input);

            var node = document.createDocumentFragment();
            this.childNodes(input, template, node);
            var value = JDSLFunction.trim(JDSLFunction.nodeToString(node));
            
            output.setAttribute(name, value);
        }

        this.withParams = function(input, template) {
            for (var i=0; i < template.childNodes.length; ++i) {
                var c = template.childNodes[i];
                if (JDSLFunction.isElement(c, 'j:with-param')) {
                    this.variable(input, c);
                }
            }
        }

        this.init = function() {
            this.variables.root(arguments[0]);
            this.processContext.apply(this, arguments);
        }

        this.variables = new JDSLVariables();
    }

    JDSL.ElementNotFoundError = function(tagName) { }
    JDSL.ElementMalformedError = function(tagName) { }
    JDSL.ElementMisplacedError = function(tagName) { }
    JDSL.AttributeMalformedError = function(tagName, attributeName) { }

    // Static Properties
    JDSL.templates = {};

    // Events
    JDSL.EVENT_JDSL_READY = 'jdsl-ready';

    // DOM Node
    JDSL.DOM_NODE_ELEMENT               = 1;
    JDSL.DOM_NODE_ATTRIBUTE             = 2;
    JDSL.DOM_NODE_TEXT                  = 3;
    JDSL.DOM_NODE_CDATA_SECTION         = 4;
    JDSL.DOM_NODE_ENTITY_REFERENCE      = 5;
    JDSL.DOM_NODE_ENTITY                = 6;
    JDSL.DOM_NODE_PROCESSING_INSTRUCTION= 7;
    JDSL.DOM_NODE_COMMENT               = 8;
    JDSL.DOM_NODE_DOCUMENT              = 9;
    JDSL.DOM_NODE_DOCUMENT_TYPE         = 10;
    JDSL.DOM_NODE_DOCUMENT_FRAGMENT     = 11;
    JDSL.DOM_NODE_NOTATION              = 12;

    JDSL.FILTER_INCLUDE = true;
    JDSL.FILTER_EXCLUDE = false;

    JDSL.MESSAGE_LEVEL_LOG      = 'log';
    JDSL.MESSAGE_LEVEL_DEBUG    = 'debug';
    JDSL.MESSAGE_LEVEL_INFO     = 'info';
    JDSL.MESSAGE_LEVEL_WARN     = 'warn';
    JDSL.MESSAGE_LEVEL_ERROR    = 'error';
})();

(function(){
    JDSLElements = { instruction: {} };

    JDSLElements.elements = {
        'attribute'     : 'attribute',
        'call-template' : 'call-template',
        'choose'        : 'choose',
        'switch'        : 'switch',
        'case'          : 'case',
        'comment'       : 'comment',
        'element'       : 'element',
        'fallback'      : 'fallback',
        'loop'          : 'loop',
        'for-each'      : 'for-each',
        'sort'          : 'sort',
        'if'            : 'if',
        
        'log'           : 'message',
        'message'       : 'message',

        'stylesheet'    : 'stylesheet',
        'template'      : 'template',
        'text'          : 'text',

        'value-of'      : 'value-of',
        'param'         : 'param',
        'var'           : 'variable',
        'variable'      : 'variable',
        'with-param'    : 'with-param',

        'script'        : 'script'
    };

    JDSLElements.instruction['attribute'] = function(input, template, output) {
        return;
    }
    
    JDSLElements.instruction['call-template'] = function(input, template, output) {
        var rel = template.getAttribute('rel');
        var select = template.getAttribute('select');
        
        if (!rel) {
            throw new JDSL.AttributeMalformedError('template', 'rel');
        }
        
        var callTemplate = JDSL.templates[rel];
        
        if (!callTemplate) {
            throw new JDSL.AttributeMalformedError('template', 'rel');
        }
        
        if (select) {
            select = this.variables.eval.call(input, select);
        } else {
            select = input;
        }

        var jdslChild = new JDSL();
        jdslChild.withParams(input, template);
        jdslChild.init(select, JDSL.templates[rel], output);
    }
    
    // Implements j:choose and its child node j:case
    JDSLElements.instruction['choose'] = function(input, template, output) {
        for (var i=0; i < template.childNodes.length; ++i) {
            var childNode = template.childNodes[i];
            
            if (childNode.nodeType != JDSL.DOM_NODE_ELEMENT) {
                continue;
            }
            
            if (!JDSLFunction.isElement(childNode, 'j:case')) {
                throw new JDSL.ElementMisplacedError(childNode.nodeName);
            }
            
            var caseTest = childNode.getAttribute('test');
            
            if (!caseTest || this.variables.eval.call(input, caseTest) == true) {
                this.childNodes(input, childNode, output);
                break;
            }
        }
    }
    
    // Implements j:switch and its child node j:case
    JDSLElements.instruction['switch'] = function(input, template, output) {
        var switchSelect = template.getAttribute('select');
        
        if (!switchSelect) {
            throw new JDSL.AttributeMalformedError('switch', 'select');
        }
        
        switchSelect = this.variables.eval.call(input, switchSelect);
        
        for (var i=0; i < template.childNodes.length; ++i) {
            var childNode = template.childNodes[i];
            
            if (childNode.nodeType != JDSL.DOM_NODE_ELEMENT) {
                continue;
            }
            
            if (!JDSLFunction.isElement(childNode, 'j:case')) {
                throw new JDSL.ElementMisplacedError(childNode.nodeName);
            }
            
            var caseSelect = childNode.getAttribute('select');
            
            if (!caseSelect || this.variables.eval.call(input, caseSelect) == switchSelect) {
                this.childNodes(input, childNode, output);
                break;
            }
        }
    }
    
    JDSLElements.instruction['comment'] = function(input, template, output) {
        var node = document.createDocumentFragment();
        this.childNodes(input, template, node);
        var commentNode = document.createComment(JDSLFunction.nodeToString(node));
        output.appendChild(commentNode);
    }
    
    JDSLElements.instruction['element'] = function(input, template, output) {
        var name = this.parseAttribute(template.getAttribute('name'), input);
        var node = document.createElement(name);
        output.appendChild(node);
        
        this.childNodes(input, template, node);
    }
    
    JDSLElements.instruction['fallback'] = function(input, template, output) {
        return;
    }
    
    JDSLElements.instruction['loop'] = function(input, template, output) {
        var key     = template.getAttribute('key') || null;
        var times   = parseInt(this.parseAttribute(template.getAttribute('times'))) || 0;
        
        for (var i=0; i < times; ++i) {
            if (key)    this.variables.set(key, ++i);
            this.childNodes(input, template, output);
            if (key)    this.variables.unset(key);
        }
    }
    
    JDSLElements.instruction['for-each'] = function(input, template, output) {
        var key = template.getAttribute('key');
        var value = template.getAttribute('value');
        var select = template.getAttribute('select');
        var nodes = this.variables.eval.call(input, select);
        
        // Sort
        var sortContext = nodes.slice(0);
        var sortElements = JDSLFunction.nodeListFilter(template.childNodes, 'nodeName', JDSL.FILTER_INCLUDE, 'j:sort');
        for (var i=0; i < sortElements.length; ++i) {
            var childNode = sortElements[i];
        
            var sortSelect   = childNode.getAttribute('select')    || 'this';
            var sortSortType = childNode.getAttribute('sort-type') || 'text'; 
            var sortOrder    = childNode.getAttribute('order')     || 'ascending';

            if (typeof JDSLSort[sortSortType] !== "function") {
                throw new AttributeMalformedError('sort', 'sort-type');
            }

            var $this = this;
            sortContext.sort(function(a, b) {
                var aVal = JDSLSort[sortSortType].call($this, $this.variables.eval.call(a, sortSelect));
                var bVal = JDSLSort[sortSortType].call($this, $this.variables.eval.call(b, sortSelect));
                return aVal - bVal;
            });

            switch(sortOrder) {
                case JDSL_SORT.SORT_ORDER_ASCENDING:  break;
                case JDSL_SORT.SORT_ORDER_DESCENDING: sortContext.reverse(); break;
            }
        }

        // Output
        for (var i=0; i < sortContext.length; ++i) {
            var node = sortContext[i];
            
            if (key)    this.variables.set(key, i);
            if (value)  this.variables.set(value, node);
            
            this.childNodes(node, template, output);
            
            if (key)    this.variables.unset(key);
            if (value)  this.variables.unset(value);
        }
    }
    
    JDSLElements.instruction['if'] = function(input, template, output) {
        var test = template.getAttribute('test');
        
        if (this.variables.eval.call(input, test)) {
            this.childNodes(input, template, output);
        }
    }
    
    JDSLElements.instruction['sort'] = function(input, template, output) {
        return;
    }
    
    JDSLElements.instruction['stylesheet'] = function(input, template, output) {
        throw new JDSL.ElementMisplacedError('stylesheet');
    }
    
    JDSLElements.instruction['template'] = function(input, template, output) {
        this.childNodes(input, template, output);
    }
    
    JDSLElements.instruction['text'] = function(input, template, output) {
        var node = document.createTextNode(template.textContent);
        output.appendChild(node);
    }
    
    JDSLElements.instruction['value-of'] = function(input, template, output) {
        var select = template.getAttribute('select');
        var value = JDSLFunction.asString(this.variables.eval.call(input, select));
        var node = document.createTextNode(value);
        output.appendChild(node);
    }
    
    JDSLElements.instruction['param'] = function(input, template, output) {
        if (this.variables.get(template.getAttribute('name')) === undefined) {
            this.variable(input, template);
        }
    }
    
    JDSLElements.instruction['variable'] = function(input, template, output) {
        this.variable(input, template);
    }
    
    JDSLElements.instruction['case'] = function(input, template, output) {
        throw new JDSL.ElementMisplacedError('case');
    }
    
    JDSLElements.instruction['with-param'] = function(input, template, output) {
         throw new JDSL.ElementMisplacedError('with-param');
    }
    
    JDSLElements.instruction['message'] = function(input, template, output) {
        var select = template.getAttribute('select');
        var level = template.getAttribute('level') || JDSL.MESSAGE_LEVEL_LOG;
        
        var value = null;
        
        if (template.childNodes.length > 0) {
            var node = template.ownerDocument.createDocumentFragment();
            this.childNodes(input, template, node);
            messageText = JDSLFunction.nodeToString(node);
        } else if (select) {
            messageText = this.variables.eval.call(input, select);
        }
        
        switch (level) {
            case JDSL.MESSAGE_LEVEL_LOG:
            case JDSL.MESSAGE_LEVEL_DEBUG:
            case JDSL.MESSAGE_LEVEL_INFO:
            case JDSL.MESSAGE_LEVEL_WARN:
            case JDSL.MESSAGE_LEVEL_ERROR:
                if (console[level]) {
                    console[level](messageText);
                } else {
                    // Some browsers don't support console.debug
                    console[JDSL.MESSAGE_LEVEL_LOG](messageText);
                }
                break;

            default:
                throw new JDSL.AttributeMalformedError('message', 'level');
        }
    }
    
    JDSLElements.instruction['script'] = function(input, template, output) {
        this.variables.eval.call(input, template.childNodes[0].nodeValue);
    }
})();

(function(){
    // JDSL Sorting
    JDSL_SORT = {};
    JDSL_SORT.SORT_TYPE_TEXT    = 'text';
    JDSL_SORT.SORT_TYPE_NUMBER  = 'number';

    JDSL_SORT.SORT_ORDER_ASCENDING   = 'ascending';
    JDSL_SORT.SORT_ORDER_DESCENDING  = 'descending';

    JDSLSort = {};

    JDSL.addSort = function(sortName, sortFunction) {
        if (JDSLSort[sortName]) {
            throw new Error('Sort method exists: ' + sortName);
        }

        JDSLSort[sortName] = sortFunction;
    }

    JDSL.addSort(JDSL_SORT.SORT_TYPE_TEXT, function(value) {
        return JDSLFunction.asString(value);
    });

    JDSL.addSort(JDSL_SORT.SORT_TYPE_NUMBER, function(value) {
        return parseInt(JDSLFunction.asString(value));
    });
})();

(function() {
    // Data Types (for variables)
    JDSLDataTypes = {};

    JDSLDataTypes.DATA_TYPE_STRING = 'string';
    JDSLDataTypes.DATA_TYPE_JSON = 'json';

    JDSL.addDataType = function(dataTypeName, dataTypeProcessor) {
        if (JDSLDataTypes[dataTypeName]) {
            throw new Error('Data type already exists: ' + dataTypeName);
        }

        JDSLDataTypes[dataTypeName] = dataTypeProcessor;
    }

    JDSL.setDefaultDataType = function(dataTypeName) {
        if (!JDSLDataTypes[datatypeName]) {
            throw new Error('Data type does not exist: ' + dataTypename);
        }

        JDSL.defaultDataType = dataTypeName;
    }

    JDSL.getDefaultDataType = function() {
        return JDSL.defaultDataType;
    }

    JDSL.addDataType(JDSLDataTypes.DATA_TYPE_STRING, function(value) {
        return value;
    });

    JDSL.addDataType(JDSLDataTypes.DATA_TYPE_JSON, function(value) {
        if (jQuery) {
            return jQuery.parseJSON(value);
        } else {
            return JSON.parseJSON(value);
        }
    });
})();

(function(){
    JDSLVariables = function() {
        var _;
        var __jdsl__variables__ = {};
        var __jdsl__contexts__ = [[]]; // Start with one context
        
        this.eval = function(__jdsl__select__) {
            return (function(){ with(__jdsl__variables__) { return eval(__jdsl__select__); } }).call(this);
        }

        this.get = function(name) {
            return __jdsl__variables__['$' + name];
        }

        this.set = function(name, value) {
            __jdsl__variables__['$' + name] = value;
            __jdsl__contexts__[__jdsl__contexts__.length-1].push(name);
        }

        this.unset = function(name) {
            __jdsl__variables__['$' + name] = null;
            delete __jdsl__variables__['$' + name];
        }

        this.root = function(root) {
            _ = root;
        }

        /*
         */
        this.allocContext = function() {    
            __jdsl__contexts__.push([]);
        }

        this.releaseContext = function() {
            var context = __jdsl__contexts__.pop();

            for (var i in context) {
                this.unset(context[i]);
            }
        }
    }
})();

(function() {
    /**
     * Node prototype
     */
    JDSLFunction = {};
    JDSLFunction.isElement = function(element, nodeName) {
        if (element.nodeType != JDSL.DOM_NODE_ELEMENT) {
            return false;
        }

        var nodeDetails = JDSLFunction.nodeReference(element);
        if ((nodeDetails.namespace + ':' + nodeDetails.name) != nodeName) {
            return false;
        }

        return true;
    }

    JDSLFunction.nodeReference = function(element) {
        var nodeDetails = { namespace: null, name: null };
        
        var nodeName = element.nodeName.toLowerCase();
        var nodeSplit = nodeName.split(/:/);
        
        if (typeof element.scopeName != 'undefined') {
            nodeDetails.namespace = element.scopeName;
            nodeDetails.name = nodeName;
        } else {
            if (nodeSplit.length == 1) {
                nodeDetails.name = nodeSplit[0];
            } else {
                nodeDetails.namespace = nodeSplit[0];
                nodeDetails.name = nodeSplit[1];
            }
        }
        
        return nodeDetails;
    }

    JDSLFunction.nodeToString = function(element) {
        if (document.importNode) {
            var r = document.createElement('div');
            r.appendChild(element.cloneNode(true));
            return r.innerHTML;
        } else if (element.xml) {
            // IE <= 8
            return element.xml;
        } else {
            // IE <= 8
            var r = element.ownerDocument.createElement('div');
            r.appendChild(element.cloneNode(true));
            return r.innerHTML;
        }
    }

    /**
     * NodeList prototype
     */
    JDSLFunction.nodeListFilter = function(nodeList, field, toKeep, inArray) {
        var results = [];
        
        if (!(inArray instanceof Array)) {
            inArray = [inArray];
        }
        
        for (var i=0; i < nodeList.length; ++i) {
            var fromItem = nodeList[i];
            var fromField;
            
            if (field == 'nodeName') {
                var nodeDetails = JDSLFunction.nodeReference(fromItem);
                fromField = nodeDetails.namespace + ':' + nodeDetails.name;
            } else {
                fromField = fromItem[field];
            }
            
            for (var j=0; j < inArray.length; ++j) {
                var toItem = inArray[j];
                
                if ((toKeep && fromItem[field] == toItem) || (!toKeep && fromItem[field] != toItem)) {
                    results.push(fromItem);
                    break;
                }
            }
        }
        
        return results;
    }

    /**
     */

    JDSLFunction.trim = function(text) {
        return text.replace(/^\s+|\s+$/g, '');
    }

    JDSLFunction.asString = function(value) {
        switch(typeof value) {
            case 'number':      return value;
            case 'string':      return value;
            case 'boolean':     return value;
            case 'object':      return JSON.stringify(value);
            case 'function':    return value.toString();
            case 'undefined':   return '';
            case null:          return '';
        }
    }
})();

/**
 * jQuery interface
 */
if (window.jQuery) {
    (function($){
        var NS = 'jdsl';

        setTimeout(function(){
            var stylesheets = $('link[rel="stylesheet"][type="text/jdsl"]');
            var externalSize = stylesheets.size();
            var externalDone = 0;

            var jdslLoad = {};
            jdslLoad.success = function(stylesheet) {
                $.each(stylesheet.documentElement.childNodes, function(i, domElement) {
                    if (JDSLFunction.isElement(domElement, 'j:template')) {
                        JDSL.templates['#'+domElement.getAttribute('id')] = domElement;
                    }
                });
            };

            jdslLoad.error = function(){
                console.log('Error occurred loading a file');
            };

            jdslLoad.complete = function(){
                externalDone++;

                if (externalDone == externalSize) {

                    $(window).trigger(JDSL.EVENT_JDSL_READY);
                }
            };

            stylesheets.each(function(){
                var $this = $(this);
                $.ajax({
                    url     : $this.attr('src'),
                    cache   : false,
                    dataType: 'xml',
                    success : jdslLoad.success,
                    error   : jdslLoad.error,
                    complete: jdslLoad.complete
                });
            });
        }, 1);

        var methods = {};
        methods.init = function(options) {
            return this.each(function() {
                var $this = $(this);
                    data = $this.data(NS),
                    tooltip = $('<div />', {
                        text : $this.attr('title')
                    });
                
                // If the plugin hasn't been initialized yet
                if (data) {
                    return;
                }

                if (!options.data) {
                    throw new Error('$.jdsl does not include data option');
                }

                if (!options.template) {
                    throw new Error('$.jdsl does not include template option');
                }

                var jdsl = new JDSL();
                jdsl.init(options.data, JDSL.templates[options.template], this);

                $(this).data(NS, options);
            });
        };

        methods.get_data = function() {
            return $(this).data(NS)['data'];
        }

        methods.get_template = function() {
            return $(this).data(NS)['template'];
        }

        methods.set_data = function(value) {
            var $this = $(this);
            var data = $this.data(NS);
            data['data'] = value;

            $this.data(NS, data);
        };

        methods.set_template = function() {
            var $this = $(this);
            var data = $this.data(NS);
            data['template'] = value;

            $this.data(NS, data);
        };

        methods.destroy = function() {
            return this.each(function() {
                var $this = $(this),
                    data = $this.data(NS);

                $(window).unbind('.' + NS);
                data.tooltip.remove();
                $this.removeData(NS);
            });
        };

        $.fn[NS] = function(method) {
            if (methods[method]) {
                return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
            } else if (typeof method === 'object' || !method) {
                return methods.init.apply(this, arguments);
            } else {
                $.error('Method ' +  method + ' does not exist on jQuery.' + NS);
            }
        }
    })(jQuery);
}