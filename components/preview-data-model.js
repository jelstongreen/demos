var PreviewMetadataModel = Backbone.Model.extend({
    defaults: {
        context: null,
        key: null,
        longName: null,
        missingValue: null,
        name: null,
        units: null,
        abbreviation: null,
        dimensions: null
    }
});

var PreviewDataModel = Backbone.Model.extend({

    url: '',

    defaults: {
        lat: null,
        lon: null,
        values: null
    },

    initialize: function(options) {
        this.opendapDataQueryModel = options.opendapDataQueryModel;

        this.listenTo(this.opendapDataQueryModel, 'change', function(){ this.fetch({reset: true}); });
    },

    fetch: function(){
        var that = this;
        var q = this.opendapDataQueryModel.toJSON();

        var dataPreviewDods = q.threddsURL + '.dods?' + q.variableName + q.dimensionFilters.map(function(d) {
            return '[' + d.join(':') + ']';
        }).join('')
        if(q.contexts) {
            dataPreviewDods += ',' + contexts.join();
        }

        console.log('Preview data query', dataPreviewDods);

        jsdap.loadData(dataPreviewDods, function(d) {
            var dimensionCount = d[0].length - 1;
            var lat = d[0][dimensionCount - 1];
            var lon = d[0][dimensionCount];
            var values = d;
            for(var i = 0; i < dimensionCount; i++) {
                values = values[0];
            }
            var data = {
                lat: lat,
                lon: lon,
                values: values
            }

            console.log('PreviewDataModel', '\nraw: ', d, '\nparsed: ', data);

            that.set(data);
        });
    }
});

var OpendapMetadataCollection = Backbone.Collection.extend({

    url: '',

    model: PreviewMetadataModel,

    comparator: function(a, b) {
        return (a.get('longName') >= b.get('longName')) ? 1 : -1;
    },

    initialize: function(options) {
        this.opendapMetadataQueryModel = options.opendapMetadataQueryModel;

        this.listenTo(this.opendapMetadataQueryModel, 'change', function(){ this.fetch({reset: true}); });
    },

    fetch: function(){
        var that = this;
        var q = this.opendapMetadataQueryModel.toJSON();

        var dataPreviewURL = q.threddsURL;

        console.log('Preview data query', dataPreviewURL);

        jsdap.loadDataset(dataPreviewURL, function(d) {
            var variables = [];
            for(var dB in d) {
                var value = d[dB];
                if(value.attributes && value.attributes._mx_is_data) {
                    var dimensions = {};
                    value.array.dimensions.forEach(function(dC, iC) {
                        dimensions[dC] = value.array.shape[iC];
                    });
                    var context = value.attributes._mx_parent_context.replace(/"context_/gi, '')
                    context = context.replace(/context_/gi, '')
                    context = context.replace(/"/gi, '')
                    variables.push({
                        key: value.id,
                        name: value.attributes.standard_name.replace(/"/gi, ''),
                        longName: value.attributes.long_name.replace(/"/gi, ''),
                        abbreviation: value.attributes.abbreviation.replace(/"/gi, ''),
                        type: value.type,
                        dimensions: dimensions,
                        units: value.attributes.units.replace(/"/gi, ''),
                        missingValue: (typeof value.attributes.missing_value !== 'undefined') ? value.attributes.missing_value : value.attributes._FillValue,
                        context: context
                    });
                }
            }

            that.reset(variables);
            console.log('PreviewMetadataModel', '\nraw: ', d, '\nparsed: ', variables);
            // console.log(JSON.stringify(variables.map(function(d, i){ return d.key; }).sort()));
        });
    }
});
