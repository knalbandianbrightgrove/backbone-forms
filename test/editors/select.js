;(function(Form, Editor) {

  module('Select', {
    setup: function() {
        this.sinon = sinon.sandbox.create();
    },

    teardown: function() {
        this.sinon.restore();
    }
  });

  var same = deepEqual;

  var OptionModel = Backbone.Model.extend({
    toString: function() {
      return this.get('name');
    }
  });

  var OptionCollection = Backbone.Collection.extend({
    model: OptionModel
  });

  var schema = {
    options: ['Sterling', 'Lana', 'Cyril', 'Cheryl', 'Pam']
  };

  var optGroupSchema = {
    options: [
      {
        group: 'Cities',
        options: [ 'Paris', 'Beijing', 'San Francisco']
      },
      {
        group: 'Countries',
        options: [{val: 'fr', label: 'France'}, {val: 'cn', label: 'China'}]
      }
    ]
  };



  test('Default value', function() {
    var editor = new Editor({
      schema: schema
    }).render();

    equal(editor.getValue(), 'Sterling');
  });

  test('Custom value', function() {
    var editor = new Editor({
      value: 'Cyril',
      schema: schema
    }).render();

    equal(editor.getValue(), 'Cyril');
  });

  test('Value from model', function() {
    var editor = new Editor({
      model: new Backbone.Model({ name: 'Lana' }),
      key: 'name',
      schema: schema
    }).render();

    equal(editor.getValue(), 'Lana');
  });

  test('Correct type', function() {
    var editor = new Editor({
      schema: schema
    }).render();

    equal($(editor.el).get(0).tagName, 'SELECT');
  });

  test('Uses Backbone.$ not global', function() {
    var old$ = window.$,
      exceptionCaught = false;

    window.$ = null;

    try {
      var editor = new Editor({
        schema: schema
      }).render();
    } catch(e) {
      exceptionCaught = true;
    }

    window.$ = old$;

    ok(!exceptionCaught, ' using global \'$\' to render');
  });

  test('Option groups', function() {
    var editor = new Editor({
      schema: optGroupSchema
    }).render();

    equal(editor.$('optgroup').length, 2);
    equal(editor.$('optgroup').first().attr('label'), 'Cities')
  });

  test('Option groups only contain their "own" options', function() {
    var editor = new Editor({
      schema: optGroupSchema
    }).render();

    var group = editor.$('optgroup').first();
    equal($('option', group).length, 3);
    var options = _.map($('option', group), function(el) {
        return $(el).text();
    });
    ok(~options.indexOf('Paris'));
    ok(~options.indexOf('Beijing'));
    ok(~options.indexOf('San Francisco'));

    var group = editor.$('optgroup').last();
    equal($('option', group).length, 2);
    var options = _.map($('option', group), function(el) {
        return $(el).text();
    });
    ok(~options.indexOf('France'));
    ok(~options.indexOf('China'));
  });

  test('Option groups allow to specify option value / label', function() {
    var editor = new Editor({
      schema: optGroupSchema
    }).render();

    var group = editor.$('optgroup').last();
    var options = $('option', group);
    equal(options.first().attr('value'), 'fr');
    equal(options.last().attr('value'), 'cn');
    equal(options.first().text(), 'France');
    equal(options.last().text(), 'China');
  });

  test('Option groups with options as string', function() {
    var editor = new Editor({
      schema: {
        options: [
          {
            group: 'Cities',
            options: '<option>Paris</option><option>Beijing</option><option>San Francisco</option>'
          },
          {
            group: 'Countries',
            options: '<option value="fr">France</option><option value="cn">China</option>'
          }
        ]
      }
    }).render();

    var group = editor.$('optgroup').first();
    equal(group.attr('label'), 'Cities');
    equal($('option', group).length, 3);
    equal($('option', group).first().text(), 'Paris');
    equal(editor.$('optgroup').length, 2);
  });

  test('Option groups with options as callback', function() {
    var editor = new Editor({
      schema: {
        options: function(callback, thisEditor) {
          ok(thisEditor instanceof Editor);
          ok(thisEditor instanceof Form.editors.Base);
          callback(optGroupSchema.options);
        }
      }
    }).render();

    var optgroups = editor.$('optgroup');

    equal(optgroups.length, 2);

    equal($('option', optgroups.first()).first().text(), 'Paris');
    equal($('option', optgroups.last()).first().text(), 'France');
    equal($('option', optgroups.last()).first().attr('value'), 'fr');
  });

  test('Each option group as its own callback', function() {
    var editor = new Editor({
      schema: {
        options: [
          {
            group: 'Cities',
            options: function(callback, thisEditor) {
              ok(thisEditor instanceof Editor);
              ok(thisEditor instanceof Form.editors.Base);
              callback(optGroupSchema.options[0].options);
            }
          },
          {
            group: 'Countries',
            options: function(callback, thisEditor) {
              ok(thisEditor instanceof Editor);
              ok(thisEditor instanceof Form.editors.Base);
              callback(optGroupSchema.options[1].options);
            }
          }
        ]
      }
    }).render();

    var optgroups = editor.$('optgroup');

    equal(optgroups.length, 2);

    equal($('option', optgroups.first()).first().text(), 'Paris');
    equal($('option', optgroups.last()).first().text(), 'France');
    equal($('option', optgroups.last()).first().attr('value'), 'fr');
  });

  test('Mixed specification for option groups', function() {
    var countries = new OptionCollection([
      { id: 'fr', name: 'France' },
      { id: 'cn', name: 'China' }
    ]);
    var editor = new Editor({
      schema: {
        options: [
          { group: 'Countries', options: countries },
          { group: 'Cities', options: ['Paris', 'Beijing', 'Tokyo']},
          { group: 'Food', options: '<option>Bread</option>'},
          { group: 'Cars', options: function(callback, thisEditor) {
            ok(thisEditor instanceof Editor);
            ok(thisEditor instanceof Form.editors.Base);
            callback(['VolksWagen', 'Fiat', 'Opel', 'Tesla']);
          }}
        ]
      }
    }).render();

    var optgroups = editor.$('optgroup');

    equal(optgroups.length, 4);
    // Countries:
    var options = $('option', optgroups.get(0));
    equal(options.length, 2);
    equal(options.first().attr('value'), 'fr');
    equal(options.first().text(), 'France');
    // Cities
    var options = $('option', optgroups.get(1));
    equal(options.length, 3);
    equal(options.first().text(), 'Paris');
    // Food
    var options = $('option', optgroups.get(2));
    equal(options.length, 1);
    equal(options.first().text(), 'Bread');
    // Cars
    var options = $('option', optgroups.get(3));
    equal(options.length, 4);
    equal(options.last().text(), 'Tesla');
  });

  test('Option groups with collections', function() {
    var countries = new OptionCollection([
      { id: 'fr', name: 'France' },
      { id: 'cn', name: 'China' }
    ]);
    var cities = new OptionCollection([
      { id: 'paris', name: 'Paris' },
      { id: 'bj', name: 'Beijing' },
      { id: 'sf', name: 'San Francisco' }
    ]);

    var editor = new Editor({
      schema: {
        options: [
          {
            group: 'Countries',
            options: countries
          },
          {
            group: 'Cities',
            options: cities
          }
        ]
      }
    }).render();

    var optgroups = editor.$el.find('optgroup');
    equal(optgroups.length, 2);

    equal($('option', optgroups.first()).first().text(), 'France');
    equal($('option', optgroups.first()).first().attr('value'), 'fr');
    equal($('option', optgroups.last()).last().attr('value'), 'sf');
    equal($('option', optgroups.last()).last().text(), 'San Francisco');
  });

  test('setOptions() - updates the options on a rendered select', function() {
    var editor = new Editor({
      schema: schema
    }).render();

    editor.setOptions([1,2,3]);

    var newOptions = editor.$el.find('option');

    equal(newOptions.length, 3);
    equal(newOptions.first().html(), 1);
    equal(newOptions.last().html(), 3);
  });

  test('Options as array of items', function() {
    var editor = new Editor({
      schema: {
        options: ['Matilda', 'Larry']
      }
    }).render();

    var newOptions = editor.$el.find('option');

    equal(newOptions.first().html(), 'Matilda');
    equal(newOptions.last().html(), 'Larry');
  });

  test('Options as array of objects', function() {
    var editor = new Editor({
      schema: {
        options: [
          { val: 'kid1', label: 'Teo' },
          { val: 'kid2', label: 'Lilah' },
        ]
      }
    }).render();

    var newOptions = editor.$el.find('option');

    equal(newOptions.first().val(), 'kid1');
    equal(newOptions.last().val(), 'kid2');
    equal(newOptions.first().html(), 'Teo');
    equal(newOptions.last().html(), 'Lilah');
  });

  test('Options as any object', function() {
    var editor = new Editor({
      schema: {
        options: {y:"Yes",n:"No"}
      }
    }).render();

    var newOptions = editor.$el.find('option');

    equal(newOptions.first().val(), 'y');
    equal(newOptions.last().val(), 'n');
    equal(newOptions.first().html(), 'Yes');
    equal(newOptions.last().html(), 'No');
  });

  test('Options as function that calls back with options', function() {
    var editor = new Editor({
      schema: {
        options: function(callback, thisEditor) {
          ok(thisEditor instanceof Editor);
          ok(thisEditor instanceof Form.editors.Base);
          callback(['Melony', 'Frank']);
        }
      }
    }).render();

    var newOptions = editor.$el.find('option');

    equal(newOptions.first().html(), 'Melony');
    equal(newOptions.last().html(), 'Frank');
  });

  test('Options as string of HTML', function() {
    var editor = new Editor({
      schema: {
        options: '<option>Howard</option><option>Bree</option>'
      }
    }).render();

    var newOptions = editor.$el.find('option');

    equal(newOptions.first().html(), 'Howard');
    equal(newOptions.last().html(), 'Bree');
  });

  test('Options as a pre-populated collection', function() {
    var options = new OptionCollection([
      { id: 'kid1', name: 'Billy' },
      { id: 'kid2', name: 'Sarah' }
    ]);

    var editor = new Editor({
      schema: {
        options: options
      }
    }).render();

    var newOptions = editor.$el.find('option');

    equal(newOptions.first().val(), 'kid1');
    equal(newOptions.last().val(), 'kid2');
    equal(newOptions.first().html(), 'Billy');
    equal(newOptions.last().html(), 'Sarah');
  });

  test('Options as a new collection (needs to be fetched)', function() {
    var options = new OptionCollection();

    this.sinon.stub(options, 'fetch', function(options) {
      this.set([
        { id: 'kid1', name: 'Barbara' },
        { id: 'kid2', name: 'Phil' }
      ]);

      options.success(this);
    });

    var editor = new Editor({
      schema: {
        options: options
      }
    }).render();

    var newOptions = editor.$el.find('option');

    equal(newOptions.first().val(), 'kid1');
    equal(newOptions.last().val(), 'kid2');
    equal(newOptions.first().html(), 'Barbara');
    equal(newOptions.last().html(), 'Phil');
  });

  test("setValue() - updates the input value", function() {
    var editor = new Editor({
      value: 'Pam',
      schema: schema
    }).render();

    editor.setValue('Lana');

    equal(editor.getValue(), 'Lana');
    equal($(editor.el).val(), 'Lana');
  });



  module('Select events', {
    setup: function() {
      this.sinon = sinon.sandbox.create();

      this.editor = new Editor({
        value: 'Pam',
        schema: schema
      }).render();

      $('body').append(this.editor.el);
    },

    teardown: function() {
      this.sinon.restore();

      this.editor.remove();
    }
  });

  test("focus() - gives focus to editor and its selectbox", function() {
    var editor = this.editor;

    editor.focus();

    ok(editor.hasFocus);
    ok(editor.$el.is(':focus'));
  });

  test("focus() - triggers the 'focus' event", function() {
    var editor = this.editor;

    var spy = this.sinon.spy();

    editor.on('focus', spy);

    editor.focus();

    ok(spy.called);
    ok(spy.calledWith(editor));
  });

  test("blur() - removes focus from the editor and its selectbox", function() {
    var editor = this.editor;

    editor.focus();

    editor.blur();

    ok(!editor.hasFocus);
    ok(!editor.$el.is(':focus'));
  });

  test("blur() - triggers the 'blur' event", function() {
    var editor = this.editor;

    editor.focus()

    var spy = this.sinon.spy();

    editor.on('blur', spy);

    editor.blur();

    ok(spy.called);
    ok(spy.calledWith(editor));
  });

  test("'change' event - bubbles up from the selectbox", function() {
    var editor = this.editor;

    var spy = this.sinon.spy();

    editor.on('change', spy);

    editor.$el.val('Cyril');
    editor.$el.change();

    ok(spy.calledOnce);
    ok(spy.alwaysCalledWith(editor));
  });

  test("'change' event - is triggered when value of select changes", function() {
    var editor = this.editor;

    var callCount = 0;

    var spy = this.sinon.spy();

    editor.on('change', spy);
    // Pressing a key
    editor.$el.keypress();
    editor.$el.val('a');

    stop();
    setTimeout(function(){
      callCount++;

      editor.$el.keyup();

      // Keeping a key pressed for a longer time
      editor.$el.keypress();
      editor.$el.val('Pam');

      setTimeout(function(){
        callCount++;

        editor.$el.keypress();
        editor.$el.val('Cheryl');

        setTimeout(function(){
          callCount++;

          editor.$el.keyup();

          // Left; Right: Pointlessly moving around
          editor.$el.keyup();
          editor.$el.keyup();

          ok(spy.callCount == callCount);
          ok(spy.alwaysCalledWith(editor));

          start();
        }, 0);
      }, 0);
    }, 0);
  });

  test("'focus' event - bubbles up from the selectbox", function() {
    var editor = this.editor;

    var spy = this.sinon.spy();

    editor.on('focus', spy);

    editor.$el.focus();

    ok(spy.calledOnce);
    ok(spy.alwaysCalledWith(editor));
  });

  test("'blur' event - bubbles up from the selectbox", function() {
    var editor = this.editor;

    editor.$el.focus();

    var spy = this.sinon.spy();

    editor.on('blur', spy);

    editor.$el.blur();

    ok(spy.calledOnce);
    ok(spy.alwaysCalledWith(editor));
  });



  module('Select Text Escaping', {
    setup: function() {
      this.sinon = sinon.sandbox.create();

      this.options = [
        {
          val: '"/><script>throw("XSS Success");</script>',
          label: '"/><script>throw("XSS Success");</script>'
        },
        {
          val: '\"?\'\/><script>throw("XSS Success");</script>',
          label: '\"?\'\/><script>throw("XSS Success");</script>',
        },
        {
          val: '><b>HTML</b><',
          label: '><div class=>HTML</b><',
        }
      ];

      this.editor = new Editor({
        schema: {
          options: this.options
        }
      }).render();

      $('body').append(this.editor.el);
    },

    teardown: function() {
      this.sinon.restore();

      this.editor.remove();
    }
  });

  test('options content gets properly escaped', function() {

    same( this.editor.schema.options, this.options );

    //What an awful string.
    //CAN'T have white-space on the left, or the string will no longer match
    //If this bothers you aesthetically, can switch it to concat syntax
    var escapedHTML = "<option value=\"&quot;/><script>throw(&quot;XSS Success&quot;);\
</script>\">\"/&gt;&lt;script&gt;throw(\"XSS Success\");&lt;/script&gt;</option><option \
value=\"&quot;?'/><script>throw(&quot;XSS Success&quot;);</script>\">\"?'/&gt;&lt;script&gt;\
throw(\"XSS Success\");&lt;/script&gt;</option><option value=\"><b>HTML</b><\">&gt;&lt;div \
class=&gt;HTML&lt;/b&gt;&lt;</option>";

    same( this.editor.$el.html(), escapedHTML );

    same( this.editor.$('option').val(), this.options[0].val );
    same( this.editor.$('option').first().text(), this.options[0].label );
    same( this.editor.$('option').first().html(), '\"/&gt;&lt;script&gt;throw(\"XSS Success\");&lt;/script&gt;' );
    same( this.editor.$('option').text(), "\"/><script>throw(\"XSS Success\");</script>\"?'/><script>throw(\"XSS Success\");</script>><div class=>HTML</b><" );
  });

  test('options object content gets properly escaped', function() {

      var options = {
        key1: '><b>HTML</b><',
        key2: '><div class=>HTML</b><'
      };

      var editor = new Editor({
        schema: {
          options: options
        }
      }).render();

    same( editor.schema.options, options );

    //What an awful string.
    //CAN'T have white-space on the left, or the string will no longer match
    //If this bothers you aesthetically, can switch it to concat syntax
    var escapedHTML = "<option value=\"key1\">&gt;&lt;b&gt;HTML&lt;/b&gt;&lt;</option>\
<option value=\"key2\">&gt;&lt;div class=&gt;HTML&lt;/b&gt;&lt;</option>";

    same( editor.$el.html(), escapedHTML );

    same( editor.$('option').val(), _.keys(options)[0] );
    same( editor.$('option').first().text(), options.key1 );
    same( editor.$('option').first().html(), '&gt;&lt;b&gt;HTML&lt;/b&gt;&lt;' );
    same( editor.$('option').text(), '><b>HTML</b><><div class=>HTML</b><' );
  });

  test('option groups content gets properly escaped', function() {
    var options = [{
      group: '"/><script>throw("XSS Success");</script>',
      options: [
        {
          val: '"/><script>throw("XSS Success");</script>',
          label: '"/><script>throw("XSS Success");</script>'
        },
        {
          val: '\"?\'\/><script>throw("XSS Success");</script>',
          label: '\"?\'\/><script>throw("XSS Success");</script>',
        },
        {
          val: '><b>HTML</b><',
          label: '><div class=>HTML</b><',
        }
      ]
    }];
    var editor = new Editor({
      schema: {
        options: options
      }
    }).render();

    same( editor.schema.options, options );

    //What an awful string.
    //CAN'T have white-space on the left, or the string will no longer match
    //If this bothers you aesthetically, can switch it to concat syntax
    var escapedHTML = "<optgroup label=\"&quot;/>\<script>throw(&quot;XSS \
Success&quot;);</script>\"><option value=\"&quot;/>\
<script>throw(&quot;XSS Success&quot;);</script>\">\"/&gt;&lt;script&gt;throw\
(\"XSS Success\");&lt;/script&gt;</option><option value=\"&quot;?'/><script>\
throw(&quot;XSS Success&quot;);</script>\">\"?'/&gt;&lt;script&gt;throw(\"XSS \
Success\");&lt;/script&gt;</option><option value=\"><b>HTML</b><\">&gt;&lt;\
div class=&gt;HTML&lt;/b&gt;&lt;</option></optgroup>";

    same( editor.$el.html(), escapedHTML );

    same( editor.$('option').val(), options[0].options[0].val );
    same( editor.$('option').first().text(), options[0].options[0].label );
    same( editor.$('option').first().html(), '\"/&gt;&lt;script&gt;throw(\"XSS Success\");&lt;/script&gt;' );
    same( editor.$('option').text(), "\"/><script>throw(\"XSS Success\");</script>\"?'/><script>throw(\"XSS Success\");</script>><div class=>HTML</b><" );
  });

})(Backbone.Form, Backbone.Form.editors.Select);
