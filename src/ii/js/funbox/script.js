document.addEventListener('DOMContentLoaded', function(){ // Аналог $(document).ready(function(){
  // console.log('Hi!')

  // // Если должен быть найден один элемент
  // if((e = document.querySelectorAll("#form_error_message_frontend + div > div:last-child label")) !== null)
  //   e.classList.add('last'); // Аналог выборки и присвоения класса
  // // Если элементов будет много
  // Array.prototype.forEach.call(document.querySelectorAll("#form_error_message_frontend + div > div:last-child label"), function(e){
  //  e.classList.add('last');
  // });
  window.routeEditor = window.routeEditor || {};

routeEditor.map = { // непосредственно карта
  id: 'map',
  subfilters: null,
  center: [55.7512,37.5984],
  zoom: 13, // начальное увеличение 
  type: "TERRAIN", // тип: физическая, политическая, гибрид
  manager: null,
  initCallbacks: [],
  inited: false,
  init: function() { // создать карту
    var options = {
      zoom: routeEditor.map.zoom,
      center: routeEditor.map.center,
      controls: []
    };

    routeEditor.map.subfilters = new ymaps.Map(document.getElementById(routeEditor.map.id), options, {minZoom: 2});
    routeEditor.map.manager = new ymaps.ObjectManager();
    routeEditor.map.subfilters.geoObjects.add(routeEditor.map.manager);


    routeEditor.map.initCallbacks.forEach(function(callback) {
      callback();
    });

    routeEditor.map.inited = true;
  },
  call: function(foo) {
    if (routeEditor.map.inited) foo();
    else routeEditor.map.initCallbacks.push(foo);
  },

  collections: {
    list: {},
 
    create: function(collectionName) { // создать коллекцию маркеров
      // получить данные коллекции и список подколлекций (писатели, кулинария)
      var collectionData = routeEditor.collections.list[collectionName];
      var color = collectionData.color || "#ff0000";
      var marks = collectionData.marks;
      if (!marks) return;

      var creating = function() {
        // создать коллекцию на карте
        // добавить в нее метки
        var marksCollection = new ymaps.GeoObjectCollection({}, {
          iconColor: color,
        });

        var markers = [];

        marks.forEach(function(mark) {
          var marker = routeEditor.map.collections.createMarker(mark, color);

          // создать маркер коллекции
          marksCollection.add(marker);

          // сохранить маркер
          markers.push({
            subfilters: marker,
            id: mark.id
          });
        });

        // скрыть коллекцию и добавить на карту
        marksCollection.options.set('visible', false);
        routeEditor.map.subfilters.geoObjects.add(marksCollection);
    

        routeEditor.map.collections.list[collectionName] = {
          marksCollection: marksCollection,
          markers: markers,
          active: false
        };
      };

      routeEditor.map.call(creating);
    },

    createMarker: function(mark, color) { // создать маркер
      var marker = new ymaps.Placemark(mark.coords);

      marker.events.add('click', function() {

        if (!routeEditor.view.inited) routeEditor.view.init();
        routeEditor.view.update(mark);
        routeEditor.view.subfilters.removeAttribute('data-hidden');

        var colName = document.getElementsByClassName('collection__name')[0];
        colName.innerHTML = mark.name;

        var subfilters, i;

        for (i = 0; subfilters = document.getElementsByClassName('subfilters')[i]; i++) {
        
        
          var dataID = subfilters.getAttribute('data-subcollection');

          if (mark.id == dataID) {
            subfilters.classList.add("subfilters_blue");
          } else {
            subfilters.classList.remove("subfilters_blue");
          }
        }

      });

      if (mark.geometry) {
        var border = routeEditor.map.collections.createBorder(mark.geometry, color);
        routeEditor.map.subfilters.geoObjects.add(border);

        // marker.events
        //   .add('mouseenter', function() {
        //     border.options.set('visible', true)
        //   })
        //   .add('mouseleave', function() {
        //     border.options.set('visible', false)
        //   });
      }
      return marker;
    },

    createBorder: function(geometry, color) {
      geometry = geometry.map(function(point) {
        return [point[1], point[0]];
      });

      var border = new ymaps.GeoObject(
          {
            geometry: {
              type: 'Polygon',
              coordinates: [geometry]
            }
          },{
            visible: false,
            strokeColor: color,
            fillColor: color,
            opacity: 0.4
          }
      );
      return border;
    },

    activate: function(collectionName) { // показать коллекцию маркеров
      var activating = function() {
        routeEditor.map.collections.list[collectionName].marksCollection.options.set('visible', true);
      };
      routeEditor.map.call(activating);
    },

    deactivate: function(collectionName) { // скрыть коллекцию маркеров
      routeEditor.map.collections.list[collectionName].marksCollection.options.set('visible', false);
    },

  }
};



routeEditor.filters = { // непосредственно фильтры
  selectors: {
    parent: ".book-world__filters",
    collections: ".filters",
    collectionAttr: "data-collection",
    subcollections: ".options",
    subcollectionAttr: "data-subcollection",
    search: "#input-search"
  },
  subfilters: {
    parent: null,
    collections: null,
    subcollections: null,
    search: null
  },
  init: function() {
    routeEditor.filters.subfilters.parent = document.querySelector(routeEditor.filters.selectors.parent);
    routeEditor.filters.subfilters.collections = document.querySelector(routeEditor.filters.selectors.collections);
    routeEditor.filters.subfilters.subcollections = document.querySelector(routeEditor.filters.selectors.subcollections);
    routeEditor.filters.subfilters.search = document.querySelector(routeEditor.filters.selectors.search);
 
    routeEditor.filters.subfilters.search.oninput = function() {
      routeEditor.filters.search();
    };

    routeEditor.filters.inited = true;
  },
  inited: false,

  list: {},
  subcollections: {},
 
  create: function(collectionName) { // записать фильтр коллекции в список
     if (!routeEditor.filters.inited) routeEditor.filters.init();

     var collectionSelector = "[" + routeEditor.filters.selectors.collectionAttr + "=" + collectionName + "]";
     routeEditor.filters.list[collectionName] = routeEditor.filters.subfilters.parent.querySelector(collectionSelector);

     routeEditor.filters.subcollections[collectionName] = [];

     var subcollections = routeEditor.collections.list[collectionName].marks;

     if (!subcollections || !subcollections.length) return;

     subcollections.forEach(function(subcollection) {
      var id = subcollection.id;
      var place = subcollection.place;
      var coords = subcollection.coords;
      var subfilters =  document.createElement('div');
      subfilters.className = 'subfilters';
      subfilters.setAttribute(routeEditor.filters.selectors.subcollectionAttr, id);
      subfilters.setAttribute(routeEditor.filters.selectors.collectionAttr, collectionName);
      subfilters.innerHTML = place;
     

      subfilters.onclick = function() {
       
        var elements = document.getElementsByClassName('subfilters');
        for (var i = 0; i < elements.length; i++) {
	        elements[i].classList.remove("subfilters_blue");  
	      };

        this.classList.add("subfilters_blue");
        routeEditor.collections.showSubcollection(collectionName, id);

        var colName = document.getElementsByClassName('collection__name')[0];
        colName.innerHTML = subcollection.name;

        routeEditor.map.subfilters.panTo(coords, {
        flying: 1,
        delay: 1500,
        zoom: 5
        });//перемещение к метке
       
      };


      routeEditor.filters.subcollections[collectionName].push({
        id: subcollection.id,
        subfilters: subfilters
      });
     });
  },

  activate: function(collectionName) { // выделить фильтр, показать подколлекции
    var collection = routeEditor.filters.list[collectionName];
    collection.style.color = "#26A9E0";
   	
    $('.filters__checkbox', collection).removeClass('filters__not-checkbox');
    $('.filters__checkbox', collection).addClass('filters__yes-checkbox');

    var subcollections = routeEditor.filters.subcollections[collectionName];
    subcollections.forEach(function(subcollection) {
      routeEditor.filters.subfilters.subcollections.appendChild(subcollection.subfilters);

    })
  },
  deactivate: function(collectionName) { // убрать выделение, убрать подколлекции
    var collection = routeEditor.filters.list[collectionName];
    collection.style.color = "black";
    $('.filters__checkbox', collection).removeClass('filters__yes-checkbox');
    $('.filters__checkbox', collection).addClass('filters__not-checkbox');

    var subcollections = routeEditor.filters.subcollections[collectionName];

    subcollections.forEach(function(subcollection) {
      var elements = document.getElementsByClassName('subfilters');
        for (var i = 0; i < elements.length; i++) {
          elements[i].classList.remove("subfilters_blue");
        };
      routeEditor.filters.subfilters.subcollections.removeChild(subcollection.subfilters);
    });

    if (!routeEditor.view.subfilters) {
      return;
    }else{
      routeEditor.view.subfilters.setAttribute('data-hidden', '');
    };
  },

  search: function(val) { // пользовательский поиск среди подколлекций
    var subfilters = document.getElementsByClassName('subfilters');

      for (var i = 0; i < subfilters.length; i++) {

        if (subfilters[i].childNodes.length == 1 && subfilters[i].innerHTML.toLowerCase().indexOf(routeEditor.filters.subfilters.search.value.toLowerCase()) == -1 && routeEditor.filters.subfilters.search.value != '') {
          subfilters[i].style.display = 'none';
        } else if (subfilters[i].style.display != 'block') {
          subfilters[i].style.display = 'block';
        };
      };    
  }
 
};

routeEditor.collections = { // общий контроллер коллекций
  list: {},
  isActive: {},

  subcollections: {},

  setData: function(collectionsData) { // создать и отобразить все коллекции
    if (!collectionsData) {
      return;
    }

    for (var collectionName in collectionsData) {
      routeEditor.collections.create(collectionName, collectionsData[collectionName]);
    }

  },

  create: function(collectionName, collectionData) { // создать коллекцию
    // записать в список контроллера
    routeEditor.collections.list[collectionName] = collectionData;
    routeEditor.collections.isActive[collectionName] = false;

    routeEditor.collections.subcollections[collectionName] = {};

    collectionData.marks.map(function(mark) {
      routeEditor.collections.subcollections[collectionName][mark.id] = mark;
    });
  
    // создать фильтр
    routeEditor.filters.create(collectionName);

    // создать коллекцию маркеров на карте
    routeEditor.map.collections.create(collectionName);
  },

  toggle: function(collectionName) {
    if (!routeEditor.collections.list[collectionName]) return;

    if (routeEditor.collections.isActive[collectionName]) {
      routeEditor.collections.deactivate(collectionName);
    } else {
      routeEditor.collections.activate(collectionName);
    }

    routeEditor.collections.isActive[collectionName] = !routeEditor.collections.isActive[collectionName];   
  },

  activate: function(collectionName) { // активировать коллекцию
    if (!routeEditor.collections.list[collectionName]) {
    
      return;
    }
   
    routeEditor.filters.activate(collectionName);
    routeEditor.map.collections.activate(collectionName);
  },

  deactivate: function(collectionName) { // деактивировать коллекцию
    if (!routeEditor.collections.list[collectionName]) return;
   
    routeEditor.filters.deactivate(collectionName);
    routeEditor.map.collections.deactivate(collectionName);
  },

  showSubcollection: function(collectionName, subcollectionId) { // показать подколлекцию
    var subcollection = routeEditor.collections.subcollections[collectionName][subcollectionId];
   
    routeEditor.view.show(subcollection);
  },

  setActive: function(collectionName) {
    var collection = routeEditor.collections.list[collectionName];
  },
};

$(document).keyup(function(esc) {
    if (esc.keyCode == 27) {
    	routeEditor.view.subfilters.setAttribute('data-hidden', '');
    	$('.subfilters').removeClass('subfilters_blue');
    }
});

$('.collection__close').click(function(){
	routeEditor.view.subfilters.setAttribute('data-hidden', '');
    $('.subfilters').removeClass('subfilters_blue');
});

function showMap() {
  $('.bg').fadeOut(500);
  $('.overlap').fadeOut(500);
  $('.logo').fadeOut(500);
  $('.book-world__filters').addClass('filters__move-right');
};
  



ymaps.ready(routeEditor.map.init);
});