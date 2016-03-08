# Pretty Select v0.8.5

### Documentation and examples can be found on [zanecz.github.io/prettySelect/](http://zanecz.github.io/prettySelect/)

Pretty Select is a jQuery plugin to turn your old select boxes into pretty ones. With completely free hands on editing templates of select boxes and ability to load values dynamically, this plugin comes in handy for both beginners and skilled developers.

### Installation
Download and include files

```html
<head>
    <link rel="stylesheet" href="bootstrap.min.css">
    <link rel="stylesheet" href="prettySelect.css">
    <script src="jquery.min.js"></script>
    <script src="prettySelect.js"></script>
</head>
```

Run prettySelect()

```javascript
$("select").prettySelect();
```

And you're done :smile:

### Features list
-------------
#### Default Pretty Select
Turns your old select boxes into pretty ones styled with Bootstrap 3.

#### Searchbar
allowing users to filter options by default or customised filter function.

#### Full template customisation
You get full power over how your select boxes look like.

#### Dynamic options loading
It is possible to setup a function to insert options from other values or through AJAX. *(Connected with searchbar)*

#### Extended values
From v0.8.5 it is possible to load extended values instead of just text. *(This simplifies returning values form server, you can simply return array of values now)*

#### Disabled support
From v0.8.5 it is possible to pass in disabled values.
