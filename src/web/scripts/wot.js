var Player = function() {
	this.id 		= null;
	this.position 	= null;
	this.team 		= null;
	this.alive		= null;
	this.clock		= null;
	this.username = null;
	this.tankname = null;
	this.tanktype = null;
	this.aggressor = null;
	this.received_damage = false;
	this.health = 0;
}

Player.prototype = {
}

var Model = function(game, map_boundaries) {
	this.players 	= {};
	this.playerDetails 	= {};
	this.clock		= 0;
	this.game		= game;
	this.map_boundaries = map_boundaries;
}

Model.prototype = {
	getPlayer: function(id) {
		var player = this.players[id];
		if (typeof(player) == 'undefined') {
			player = new Player();
			player.id = id;
			player.alive = true;
			this.players[id] = player;
		}
		return player;
	},
	update: function(frame) {
		// update clock
		if (typeof(frame.clock) == 'undefined') {
			return;
		}

		if (frame.clock != null) {
			this.clock = frame.clock;
		}

		if (typeof(frame.position) != 'undefined' 
				&& typeof(frame.player_id) != 'undefined') {
			var player = this.getPlayer(frame.player_id);
			player.position = frame.position;
			player.team 	= frame.team;
			player.clock	= this.clock;
		}

		if (typeof(frame.source) != 'undefined'
				&& typeof(frame.health) != 'undefined') {
			var player = this.getPlayer(frame.player_id);
			player.received_damage = true;
			player.health = frame.health;
			player.aggressor = this.getPlayer(frame.source);
			player.clock = this.clock;

		}

		if (typeof(frame.target) != 'undefined'
				&& typeof(frame.destroyed_by) != 'undefined') {
			var player 	 = this.getPlayer(frame.target);
			player.alive = false;
			player.clock = this.clock;
		}
	}
}

var Viewer = function(target, slider, playerDetails, JSONURL, IMGURL) {
	this.target = target;
	this.slider = slider;
	this.JSONURL = JSONURL;
	this.IMGURL = IMGURL;
	this.playerDetails = playerDetails;
	this.model = null;

	//target.classList.add('replay-viewer');

	this.map = document.createElement('img');
	//this.map.classList.add('map'); not supported by IE8
	this.map.className +=' map';
	this.map.width = this.map.height = 500
	this.target.appendChild(this.map);

	this.overlay = document.createElement('canvas');
	//this.overlay.classList.add('overlay'); not supported by IE8
	this.overlay.className +=' overlay';
	this.overlay.width = this.overlay .height = 500;
	this.target.appendChild(this.overlay);
	

}

Viewer.prototype = {
	replay: function(data) {
		
		this.updateChat('15:00 Roll out!');
		var ctx = this.overlay.getContext("2d");
		this.model = new Model(data.summary, data.map_boundaries);

		var update = function(model, packets, window_start, window_size, start_ix) {
			// model of the viewer change -> stop
			if (this.model != model) {
				return;
			}
			$("#slider").slider('option', {min: 0, max: data.packets.length});
			var window_end = window_start + window_size, ix;
			for (ix = start_ix; ix < packets.length; ix++) {
				var packet = packets[ix];
				$("#slider").slider('value', ix);
				
				if (typeof(packet.clock) == 'undefined') {
					continue;
				}

				if (packet.clock > window_end) {
					break;
				}

				model.update(packet);
			}


			if (packet.type == 31)
			{
				this.updateChat(getClock(packet.clock, data.mode) + ' ' + packet.message)

			}


			this.show(data, ctx);
			
			if (ix < packets.length) {
				var updateSpeed = 100;
				var radioIdx = $(":radio[name='radio_speeder']").index($(":radio[name='radio_speeder']:checked")); 
				switch(radioIdx)
				{
				case 0:
					updateSpeed = 600;
					break;
				case 1:
				  updateSpeed = 300;
				  break;
				case 2:
					updateSpeed = 200;
				  break;
				case 4:
					updateSpeed = 1;
				  break;
				default:
				  updateSpeed = 50;
				}
				
				setTimeout(update.bind(this, model, packets, window_end, window_size, ix), updateSpeed);	
			}
			else
			{
				console.log("Replay finished");
				this.updateChat('Replay finished.');
			}
		}

		update.call(this, this.model, data.packets, 0, 0.1, 0);
	},
	updateChat: function(message) {
		
		message = message.replace("<font color='#FFFFFF'>", "<font color='#00BFFF'>");
		message = message.replace("<font color='#fff09d'>", "<font color='#00BFFF'>");
		message = message.replace("<font color='#80D63A'>", "<font color='#006400'>");
		message = message.replace("<font color='#FFC364'>", "<font color='#B8860B'>");
		message = message.replace("&nbsp;", " ");
		
		var previous_chat = document.getElementById("chat").innerHTML;
		document.getElementById("chat").innerHTML='<p>' + message + '</p>' + previous_chat;		
	},
	show: function(data, ctx) {

		ctx.clearRect(0, 0, 500, 500);
		
		ctx.fillStyle = "#FFFF00";
		ctx.textBaseline = "top";
		ctx.font = "bold 15px Tahoma";
		ctx.fillText(getClock(this.model.clock, data.mode), 450, 5);

		for (var player_id in this.model.players) {
			var player = this.model.players[player_id];
			if (typeof(player.team) == undefined
					|| player.position == null
					|| [0,1].indexOf(player.team) < 0) {
				continue;
			}

			var coord = to_2d_coord(player.position, this.model.map_boundaries, 500, 500);
			
			var colors = [
				[255, 0, 0],
				[0, 255, 0]
			];

			var recorder_color = [0, 0, 255];

			ctx.lineWidth = 3;
			var color = player.id == data.recorder_id ?  recorder_color : colors[player.team];

			var team_color_icon = 'red';
			if (player.team==1)
			{
				team_color_icon = 'green';	
			}

			if (player.received_damage) 
			{
				
				var element_player_received = document.getElementById(player.id + '_received');
				var player_received = parseInt(element_player_received.innerHTML);

				if (player.health==65535)
				{
					damage_dealt = this.playerDetails[player.id]['health_start']-player_received;
				}
				else
				{
					damage_dealt = this.playerDetails[player.id]['health_start']-player_received-player.health;
				}
				

				player_received += damage_dealt;
				element_player_received.innerHTML=player_received;

				var element_player_dealt = document.getElementById(player.id + '_dealt');
				var player_dealt = parseInt(element_player_dealt.innerHTML);

				var element_player_ratio = document.getElementById(player.id + '_ratio');
				var damage_ratio_player = 0;
				if (player_dealt>0 && player_received>0)
				{
					damage_ratio_player = Math.floor((player_dealt/player_received)*100);
				}
				
				if (player_dealt>0 && player_received==0)
				{
					damage_ratio_player = player_dealt;
				}
				
				if (player_dealt==0 && player_received>0)
				{
					damage_ratio_player = 0;
				}
				
				element_player_ratio.innerHTML=damage_ratio_player+"%";







				var element_aggressor_dealt = document.getElementById(player.aggressor.id + '_dealt');
				var aggressor_dealt = parseInt(element_aggressor_dealt.innerHTML);
				aggressor_dealt += damage_dealt;
				element_aggressor_dealt.innerHTML=aggressor_dealt;

				var element_aggressor_received = document.getElementById(player.aggressor.id + '_received');
				var aggressor_received = parseInt(element_aggressor_received.innerHTML);

				var element_aggressor_ratio = document.getElementById(player.aggressor.id + '_ratio');
				var damage_ratio_aggressor = 0;
				if (aggressor_dealt>0 && aggressor_received>0)
				{
					damage_ratio_aggressor = Math.floor((aggressor_dealt/aggressor_received)*100);
				}
				
				if (aggressor_dealt>0 && aggressor_received==0)
				{
					damage_ratio_aggressor = aggressor_dealt;
				}
				
				if (aggressor_dealt==0 && aggressor_received>0)
				{
					damage_ratio_aggressor = 0;
				}
				
				element_aggressor_ratio.innerHTML=damage_ratio_aggressor+"%";
				

				if (player.aggressor['position'] != null)
				{
					var coord_aggressor = to_2d_coord(player.aggressor['position'], this.model.map_boundaries, 500, 500);
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.moveTo(coord_aggressor.x-13.5, coord_aggressor.y-8.5);
					ctx.lineTo(coord.x-13.5, coord.y-8.5);
					ctx.stroke();
				}
				color = [255, 255, 255];
				player.received_damage = false;
				
			}
			
		
			var age   = player.alive ? ((this.model.clock - player.clock) / 20) : 0;
			age = age > 0.66 ? 0.66 : age;
			var style = "rgba(" + color[0] + "," + color[1] + "," + color[2] + "," + (1 - age) +  ")";

			ctx.strokeStyle = ctx.fillStyle = style;

			username = this.playerDetails[player.id]['username'];
			tanktype = this.playerDetails[player.id]['tanktype'];
			tankname = this.playerDetails[player.id]['tankname'];

 			var objImg = new Image();
 			objImg.src = "http://www.vbaddict.net/wot/types/tank_type_" + tanktype + "_" + team_color_icon + ".png";
 			ctx.drawImage(objImg, coord.x-13.5, coord.y-8.5);
 			//ctx.fillRect(coord.x,coord.y,1,1);
	
 			
 			
			if (player.alive)
			{
	 			ctx.font="10px Tahoma";

				
				var radioIdx = $(":radio[name='radio_tanknameoptions']").index($(":radio[name='radio_tanknameoptions']:checked")); 
				if (radioIdx==0) { ctx.fillText(tankname, coord.x+20, coord.y+2); }
				if (radioIdx==1) { ctx.fillText(username, coord.x+20, coord.y+2); }
	 			
	 		}
	 		else
 			{
 				var playerelement = document.getElementById(player.id + '_id');
 				playerelement.className="dead"; 				
 			}



		}
	},
	fetch: function(id) {
		this.serviceRequest({id: id});
	},
	process: function(file) {
		this.serviceRequest({file: file});
	},
	serviceRequest: function() {
		// send data request
		document.getElementById("btnplay").style.display='none';
		var replayRequest = new XMLHttpRequest();
		replayRequest.onprogress=updateProgress;
		this.updateChat('Requesting data...');
		console.log('Requesting JSON...');
		replayRequest.open("GET", this.JSONURL, true);
		var map = this.map;
		var viewer = this;

		replayRequest.onreadystatechange = (function(state) {
			if(replayRequest.readyState != XMLHttpRequest.DONE) {
				return;
			}

			if (replayRequest.status != 200) {
				alert('Cannot load replaydata (' + replayRequest.status + ')');
				return;
			}
			console.log('Loading finished');
			
			var response = JSON.parse(replayRequest.responseText);
			
			var data = response;
			var mapURL = '/wot/maps/' + data["map"] + "_" + data["mode"] + "_" + (data["summary"].vehicles[data.recorder_id].team - 1) + ".png";
			map.setAttribute('src', mapURL);
			document.getElementById("progressbar").style.display='none';
			document.getElementById("slider").style.display='block';
		

			viewer.replay(data);
		}).bind(this);


		replayRequest.send();
	}
}

function updateProgress(evt) 
{
   if (evt.lengthComputable) 
   {  
     var percentComplete = (evt.loaded / evt.total)*100;  
     $('#progressbar').progressbar( "option", "value", percentComplete );
     progressLabel = $( ".progress-label" );
     progressLabel.text( percentComplete + "%" );
   } 
} 


function to_2d_coord(position, map_boundaries, width, height) {
    var x = position[0], y = position[2], z = position[1];
    x = (x - map_boundaries[0][0]) * (width / (map_boundaries[1][0] - map_boundaries[0][0] + 1));
    y = (map_boundaries[1][1] - y) * (height / (map_boundaries[1][1] - map_boundaries[0][1] + 1));
    return { x: x, y: y };
}

function onRangeInputChange(e) {
	if (e.target.updating) {
		e.target.updating = true;
	}
}

function getClock(clock, mode)
{
	
	var gamelength = (mode == 'ctf' ? 938 : 638);
	var clockseconds = gamelength-clock;
	var minutes = Math.floor(clockseconds / 60);
	var seconds = Math.floor(clockseconds - minutes * 60);
	seconds = (seconds < 10 ? '0' + seconds : seconds);
	
	return minutes + ":" + seconds;
}
