Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    _startDate:null,
    _endDate:null,
    _createdDefects:0,
    _fixedDefects:0,
    _adminClosedDefects:0,
    _fixedDefectsTTR:0,
    _adminClosedDefectsTTR:0,
    _prioritiesCounts: { p1:0, p2:0, p3:0, p4:0, none:0 },
    launch: function() {
	var that = this;
	var minDate = new Date(new Date() - 86400000*360); //minDate cannot be further than one year
	var datePicker = Ext.create('Ext.panel.Panel', {
	    bodyPadding: 10,
	    renderTo: Ext.getBody(),
	    layout: 'hbox',
	    items: [{
		xtype: 'rallydatepicker',
		itemId: 'from',
		minDate: minDate,
                showToday: false,
                margin: '10 20 20 10',
                cls: 'rally-date-picker',
		handler: function(picker, date) {
		    that._onStartDateSelected(date);
		    }
		},
		{
		xtype: 'rallydatepicker',
		itemId: 'to',
		minDate: minDate,
                margin:'10 20 20 10',
                showToday: false,
                cls: 'rally-date-picker',
		handler: function(picker, date) {
		     that._onEndDateSelected(date);
		}
	    }],
            maxWidth: 500
	});        
	this.add(datePicker);
	var panel =  Ext.create('Ext.panel.Panel', {
	    id:'infoPanel',
            padding: '10 10 10 10',
	    componentCls: 'panel',
            html: 'CHOOSE START AND END DATES:',
            maxWidth: 500
	});
	this.add(panel);
    },
    _onStartDateSelected:function(date){
	console.log(date);
	this._startDate = Rally.util.DateTime.format(new Date(date), 'Y-m-d');
	if (this._endDate) {
	    Ext.getCmp('infoPanel').update('DATE RANGE: ' + this._startDate + ' and ' + this._endDate);
	    this._getCreatedDefects();
	}
	else{
	    Ext.getCmp('infoPanel').update('START DATE SELECTED: ' + this._startDate + '. PICK END DATE');
	}
    },
   
    _onEndDateSelected:function(date){
	console.log(date);
	this._endDate = Rally.util.DateTime.format(new Date(date), 'Y-m-d');
	Ext.getCmp('infoPanel').update('DATE RANGE: ' + this._startDate + ' and ' + this._endDate);
	this._getCreatedDefects();
    },   
	
    _getCreatedDefects: function(){
        var filters = [
	    {
		property : 'CreationDate',
		operator : '>=',
		value : this._startDate
	    },
	    {
		property : 'CreationDate',
		operator : '<',
		value : this._endDate
	    },
	    {
		property : 'Tags.Name',
		operator: 'contains',
		value: 'Customer Voice'
	    }
	];
        var myStore = Ext.create('Rally.data.wsapi.Store',{
            model: 'Defect',
            autoLoad:true,
            fetch: ['Name','State','FormattedID','Priority'],
            filters:filters,
            limit: Infinity,
            listeners: {
                load: function(store,records,success){
                    this._createdDefects = records.length;
                    var prioritiesCounts = this._countPriorities(records);
                    this._updatePriorities(this._prioritiesCounts, prioritiesCounts);
                    this._getFixedDefects();
                },
                scope:this
            }
        });
    },
    
     _getFixedDefects: function(){
        var filters = Rally.data.wsapi.Filter.and([
            {
		property : 'ClosedDate',
		operator : '>=',
		value : this._startDate
	    },
	    {
		property : 'ClosedDate',
		operator : '<',
		value : this._endDate
	    },
	    {
		property : 'Tags.Name',
		operator: 'contains',
		value: 'Customer Voice'
	    },
            {
                property : 'State',
		value: 'Closed'
            },
            Rally.data.wsapi.Filter.or([
            {
		property : 'Resolution',
		value : 'Code Change'
	    },
	    {
		property : 'Resolution',
		value : 'Database/Metadata Change'
	    },
	    {
		property : 'Resolution',
		value: 'Configuration Change'
	    }
            ])
        ])
        var myStore = Ext.create('Rally.data.wsapi.Store',{
            model: 'Defect',
            autoLoad:true,
            fetch: ['Name','State','FormattedID','CreationDate','ClosedDate','Priority'],
            filters:filters,
            limit: Infinity,
            listeners: {
                load: function(store,records,success){
                    this._fixedDefects = records.length;
                    this._fixedDefectsTTR = this._getClosedDefectsWithinTTR(records);
                    var prioritiesCounts = this._countPriorities(records);
                    this._updatePriorities(this._prioritiesCounts, prioritiesCounts);
                    this._getAdminClosedDefects();
                },
                scope:this
            }
        });
    },
    
    _getAdminClosedDefects:function(){
        var filters = Rally.data.wsapi.Filter.and([
            {
		property : 'ClosedDate',
		operator : '>=',
		value : this._startDate
	    },
	    {
		property : 'ClosedDate',
		operator : '<',
		value : this._endDate
	    },
	    {
		property : 'Tags.Name',
		operator: 'contains',
		value: 'Customer Voice'
	    },
            {
                property : 'State',
		value: 'Closed'
            },
            {
		property : 'Resolution',
                operator: '!=',
		value : 'Code Change'
	    },
	    {
		property : 'Resolution',
                operator: '!=',
		value : 'Database/Metadata Change'
	    },
	    {
		property : 'Resolution',
                operator: '!=',
		value: 'Configuration Change'
	    }
        ]);
        console.log('filter to string', filters.toString());
        var myStore = Ext.create('Rally.data.wsapi.Store',{
            model: 'Defect',
            autoLoad:true,
            fetch: ['Name','State','FormattedID','CreationDate','ClosedDate','Priority'],
            filters:filters,
            limit: Infinity,
            listeners: {
                load: function(store,records,success){
                    this._adminClosedDefects = records.length;
                    this._adminClosedDefectsTTR = this._getClosedDefectsWithinTTR(records);
                    var prioritiesCounts = this._countPriorities(records);
                    this._updatePriorities(this._prioritiesCounts, prioritiesCounts);
                    this._makeStore();
                },
                scope:this
            }
        });
    },
    
    _updatePriorities:function(prioritiesCounts, data){
        prioritiesCounts.p1 += data.p1;
        prioritiesCounts.p2 += data.p2;
        prioritiesCounts.p3 += data.p3;
        prioritiesCounts.p4 += data.p4;
        prioritiesCounts.none += data.none;
    },

    _countPriorities:function(records){
        var prioritiesCounts = { p1 : 0, p2 : 0, p3 : 0, p4 : 0, none : 0};
        _.each(records, function(record){
            var priority = record.get('Priority'); // Resolve Immediately, High Attention, Normal, Low, None

            if (priority == "Resolve Immediately") {
                prioritiesCounts.p1++;
            } else if (priority == "High Attention") {
                prioritiesCounts.p2++;
            } else if (priority == "Normal") {
                prioritiesCounts.p3++;
            } else if (priority == "Low") {
                prioritiesCounts.p4++;
            } else {
                prioritiesCounts.none++;
            }
        });
        return prioritiesCounts;
    },

    _getClosedDefectsWithinTTR:function(records){
        var closedDefectWithinTTRCount = [];
        var ttr = 20;
        _.each(records, function(record){
            var created = new Date(record.get('CreationDate'));
            var closed = new Date(record.get('ClosedDate'));
            console.log(record.get('FormattedID'));
            console.log('created',created);
            console.log('closed',closed);
            var diff = Math.floor((closed - created)/86400000); 
            console.log('diff', diff);
            if (diff <= ttr) {
                closedDefectWithinTTRCount.push(record);
            }
        });
        return closedDefectWithinTTRCount.length;
    },
    
    _makeStore:function(){
        var records = [];
        var d = {
            "CreatedDefects" : this._createdDefects,
            "FixedDefects" : this._fixedDefects,
            "AdminClosedDefects" : this._adminClosedDefects,
            "FixedDefectsTTR" : this._fixedDefectsTTR,
            "AdminClosedDefectsTTR" : this._adminClosedDefectsTTR,
            "P1Count" : this._prioritiesCounts.p1,
            "P2Count" : this._prioritiesCounts.p2,
            "P3Count" : this._prioritiesCounts.p3,
            "P4Count" : this._prioritiesCounts.p4,
            "NoneCount" : this._prioritiesCounts.none
        };
        records.push(d);
        this._makeGrid(records);
    },
    
    _makeGrid:function(records){
        if (this._grid) {
            this._grid.destroy();
        }
        this._grid = Ext.create('Rally.ui.grid.Grid', {
            itemId: 'defectGrid',
            store: Ext.create('Rally.data.custom.Store', {
                data: records
            }),
            columnCfgs: [
                {
                    text: 'Created Defects',
                    dataIndex: 'CreatedDefects'
                },
                {
                    text: 'Fixed Defect',
                    dataIndex: 'FixedDefects'
                },
                {
                    text: 'Administratively Closed Defects',
                    dataIndex: 'AdminClosedDefects'
                },
                {
                    text: 'Fixed Defect (TTR <= 20)',
                    dataIndex: 'FixedDefectsTTR'
                },
                {
                    text: 'Administratively Closed Defects (TTR <= 20)',
                    dataIndex: 'AdminClosedDefectsTTR'
                },
                {
                    text: 'P1 Count',
                    dataIndex: 'P1Count'
                },
                {
                    text: 'P2 Count',
                    dataIndex: 'P2Count'
                },
                {
                    text: 'P3 Count',
                    dataIndex: 'P3Count'
                },
                {
                    text: 'P4 Count',
                    dataIndex: 'P4Count'
                },
                {
                    text: 'No Priority',
                    dataIndex: 'NoneCount'
                }
            ],
            showPagingToolbar:false
        });
        this.add(this._grid);
    }
});