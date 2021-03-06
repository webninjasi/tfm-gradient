var defaultXML = '<C><P Ca="" F="8" /><Z><S><S L="800" X="400" H="20" Y="400" T="0" P="0,0,0.3,0.2,0,0,0,0" /></S><D /><O /><L><VL n="Layer1" l="-1" /><JD c="13191E,250,1,0" P1="0,15" P2="800,15" /><JD c="ff8400,250,0.3,0" P1="0,15" P2="800,15" /><JD c="ff8400,250,0.3,0" P1="0,265" P2="800,265" /><JD c="ff8400,250,0.3,0" P1="0,515" P2="800,515" /><L /></L></Z></C>';
var xmlInfo;
var xmlFromStorage;
var bgimg = new Image();
bgimg.src = "bg.png";

window.requestAnimationFrame(render);

function showNotif(name) {
	hideNotif();
	$('.notify-'+name).slideDown();
}

function hideNotif() {
	$('.notify').slideUp();
}

var State = {
		InvalidXML: 0,
		NoJointRoot: 1,
		NoJointGroup: 2,
		NoCloudMask: 3,
		Normal: 4,
	};

function checkXML(xml) {
	var ret = {}

	try {
		ret.tree = $.parseXML(xml);
		var $tree = $(ret.tree);
		ret.props = $tree.children('C').children('P');
		ret.root = $tree.children('C').children('Z');

		if (ret.tree == undefined || ret.props.length < 1 || ret.root.length < 1)
			return { state: State.InvalidXML };
	} catch (err) {
		return { state: State.InvalidXML };
	}

	ret.jointParent = ret.root.children('L');
	if (ret.jointParent.length < 1) {
		ret.state = State.NoJointRoot;
		return ret;
	}

	var joints = ret.jointParent.children('JD');
	if (joints.length == 0 || !checkCloudMask(joints)) {
		ret.state = State.NoCloudMask;
		return ret;
	}

	var jointGroups = getJointGroups(joints);
	if (jointGroups.length < 1) {
		ret.state = State.NoJointGroup;
		return ret;
	}

	ret.jointGroup = jointGroups[0];
	ret.state = State.Normal;

	return ret;
}

function checkCloudMask(joints) {
	var cloudmasks = [].filter.apply(joints, [function(j) {
			return $(j).attr('c') == '13191E,250,1,0';
		}]);

	return cloudmasks.length > 0;
}

function getJointGroups(joints) {
	var jointGroups = [];
	var jg, j;

	for (var i=0; i<joints.length; i++) {
		j = parseJoint(joints[i]);

		if (j.cs[1] == '250' && j.p1[1] == j.p2[1] && !inAGroup(jointGroups, j)) {
			jg = findJoints(joints, j);

			if (jg && jg.length > 1)
				jointGroups.push(jg);
		}
	}

	return jointGroups;
}

function findJoints(joints, j1) {
	return [].filter.apply(joints, [function(j) {
			return inSameGroup(j, j1);
		}]);
}

function inAGroup(groups, j) {
	for (var i=0; i<groups.length; i++) {
		if (inSameGroup(groups[i][0], j)) {
			return true;
		}
	}
	return false;
}

function inSameGroup(elm_j1, j2) {
	try {
		var j1 = parseJoint(elm_j1);

		return j1.c == j2.c
			&& j1.p1[0] == j2.p1[0] // p1.x
			&& j1.p2[0] == j2.p2[0]; // p2.x
	} catch (err) {}

	return false;
}

function parseJoint(j) {
	var ret = {
		c: $(j).attr('c'), // color, size, opacity, foreground
		p1: $(j).attr('P1').split(','),
		p2: $(j).attr('P2').split(','),
	}
	ret.cs = ret.c.split(',');

	return ret;
}

function parseNode(str) {
	return $($.parseXML(str)).children(0);
}

function createJoint(color, opacity, p1x, p2x, y) {
	color = color || xmlInfo.jgInfo.color;
	opacity = opacity || xmlInfo.jgInfo.opacity;
	p1x = p1x || 0;
	p2x = p2x || xmlInfo.width;

	return parseNode('<JD c="'+color+',250,'+opacity+',0" P1="'+p1x+','+y+'" P2="'+p2x+','+y+'" />').get(0);
}

function getJointGroupInfo(jg) {
	var miny, maxy, minx, maxx;
	var color, opacity, j;

	j = parseJoint(jg[0]);

	color = j.cs[0];
	opacity = parseFloat(j.cs[2]);
	opacity = isNaN(opacity) ? 0 : opacity;

	minx = Math.min(j.p1[0], j.p2[0]);
	maxx = Math.max(j.p1[0], j.p2[0]);

	for (var p1, i=0; i<jg.length; i++) {
		p1 = parseInt($(jg[i]).attr('P1').split(',')[1]);
		p1 = isNaN(p1) ? 0 : p1;

		if (miny == undefined || p1 < miny)
			miny = p1;

		if (maxy == undefined || p1 > maxy)
			maxy = p1;
	}

	return {
			color: color,
			opacity: opacity,
			minx: minx,
			miny: miny,
			maxy: maxy,
			maxx: maxx,
		};
}

function setJointGroupInfo(jg, jgInfo) {
	for (var c, i=0; i<jg.length; i++) {
		c = $(jg[i]).attr("c").split(',');
		c[0] = jgInfo.color;
		c[2] = jgInfo.opacity;
		$(jg[i]).attr("c", c.join(','));
	}
}

function parseSize(props) {
	var width = props.attr('L') || 800;
	var height = props.attr('H') || 400;

	width = parseInt(width);
	height = parseInt(height);

	xmlInfo.width = isNaN(width) ? 800 : width;
	xmlInfo.height = isNaN(height) ? 400 : height;
}

function setMapSize(height) {
	var map = document.getElementById("map");
	map.height = height;
}

function setColor(color) {
	$("#picker").spectrum("set", color);
}

function setOpacity(opacity) {
	var rgb = $("#picker").spectrum("get").toRgb();
	rgb.a = opacity;
	$("#picker").spectrum("set", rgb);
}

// XML Load/Save
function disableLoad() {
	$("button.xml-load").prop('disabled', true);
}

function enableLoad() {
	$("button.xml-load").prop('disabled', false);
}

function load() {
	disableLoad();

	var xml = $("#xml").val();
	xmlInfo = checkXML(xml);
	console.log(xmlInfo);

	if (xmlInfo.state == State.InvalidXML) {
		showNotif("invalid");
		enableLoad();

		return;
	}

	parseSize(xmlInfo.props);
	setMapSize(xmlInfo.height);

	var notif_joints;

	if (xmlInfo.state == State.NoJointRoot
		|| xmlInfo.state == State.NoCloudMask
		|| xmlInfo.state == State.NoJointGroup) {

		if (xmlInfo.state == State.NoJointRoot) {
			xmlInfo.jointParent = parseNode('<L></L>');
			$(xmlInfo.root).append(xmlInfo.jointParent);
			xmlInfo.state = State.NoCloudMask;
		}

		if (xmlInfo.state == State.NoCloudMask) {
			xmlInfo.jointParent.append(parseNode('<JD c="13191E,250,1,0" P1="0,15" P2="'+xmlInfo.width+',15" />'));
		}

		xmlInfo.jointGroup = [
				parseNode('<JD c="ff8400,250,0.3,0" P1="0,125" P2="'+xmlInfo.width+',125" />'),
				parseNode('<JD c="ff8400,250,0.3,0" P1="0,375" P2="'+xmlInfo.width+',375" />'),
			];

		for (var y=375; y<(xmlInfo.height-250); y+=250)
			xmlInfo.jointGroup.push(parseNode('<JD c="ff8400,250,0.3,0" P1="0,'+y+'" P2="'+xmlInfo.width+','+y+'" />'));
		//createJoint("ff8400", "0.3", null, null, y)

		for (var i=0; i<xmlInfo.jointGroup.length; i++)
			xmlInfo.jointParent.append(xmlInfo.jointGroup[i]);

		notif_joints = true;
	}

	xmlInfo.jgInfo = getJointGroupInfo(xmlInfo.jointGroup);

	setColor("#"+xmlInfo.jgInfo.color);
	setOpacity(xmlInfo.jgInfo.opacity);

	save();
	showNotif(notif_joints ? "joints" : "loaded");
	enableLoad();
}

function save() {
	setJointGroupInfo(xmlInfo.jointGroup, xmlInfo.jgInfo);

	var serializer = new XMLSerializer();
	var xml = serializer.serializeToString(xmlInfo.tree);

	$("#xml").val(xml);
	saveStorage(xml);
}

function resizeJoints() {
	var joint, jg = xmlInfo.jointGroup;
	var reqJoints = Math.ceil(xmlInfo.height / 250);

	if (reqJoints > (jg.length - 1)) {
		for (var y=(jg.length - 1) * 250; y<xmlInfo.height; y+=250) {
			jg.push(createJoint(null, null, null, null, y-125));
			xmlInfo.jgInfo.maxy += 250;
		}
	}	else if (reqJoints < (jg.length - 1)) {
		for (var y=(jg.length - 1) * 250; y>xmlInfo.height; y-=250) {
			jg.pop();
			xmlInfo.jgInfo.maxy -= 250;
		}
	}

	for (var i=0; i<jg.length; i++) {
		joint = parseJoint(jg[i]);
		$(jg[i]).attr('P2', xmlInfo.width+","+joint.p2[1]);
		xmlInfo.jgInfo.maxx = xmlInfo.width;
	}

	console.log(xmlInfo.jointGroup);
	save();
}

// Storage
function loadStorage() {
	if (typeof(Storage)) {
		var xml = localStorage.getItem("wn.xml");

		if (xml && xml.length > 0) {
			xmlFromStorage = xml;
		}
	}
}

function loadFromStorage() {
	if (xmlFromStorage) {
		$("#xml").val(xmlFromStorage);
		load();
	}
}

function saveStorage(xml) {
	if (typeof(Storage) && xml && xml.length > 0) {
		localStorage.setItem("wn.xml", xml);
	}
}

// Map View
function render() {
	var map = document.getElementById("map");
	var ctx = map.getContext("2d");
	var height = map.height;
	var jgi;

	if (xmlInfo && xmlInfo.jgInfo) {
		jgi = xmlInfo.jgInfo;
	} else {
		jgi = { maxx: 800, opacity: 0 };
	}

	ctx.clearRect(0, 0, jgi.maxx, height);
	ctx.drawImage(bgimg, 0, 0, bgimg.width, bgimg.height, 0, 0, jgi.maxx, height);

	ctx.fillStyle = "#13191E";
	ctx.fillRect(0, -110, 300, 250);
	
	if (jgi.opacity != 0) {
		ctx.fillStyle = "#"+jgi.color;
		ctx.globalAlpha = jgi.opacity;
		ctx.fillRect(jgi.minx, jgi.miny-125, jgi.maxx, jgi.maxy+125);
		ctx.globalAlpha = 1;
	}

	window.requestAnimationFrame(render);
}

// Color Wheel
function onPickerChange(colorInfo) {
	var color = colorInfo.toHexString().substr(1);
	var opacity = colorInfo.toRgb().a;

	if (xmlInfo.jgInfo && (xmlInfo.jgInfo.color != color || xmlInfo.jgInfo.opacity != opacity)) {
		xmlInfo.jgInfo.color = color;
		xmlInfo.jgInfo.opacity = opacity;
		save();
	}
}

$("#picker").spectrum({
	flat: true,
	preferredFormat: "hex",
	showAlpha: true,
	showInput: true,
	showButtons: false,
	showPalette: true,
	showInitial: true,
	showSelectionPalette: true,
	palette: [],
	localStorageKey: "wn.spectrum",
	change: onPickerChange,
	move: onPickerChange
});

// XML Textarea
loadStorage();
new Clipboard('button.xml-copy');
$('button.xml-load').click(load);
$('button.load-old').click(loadFromStorage);
$('button.resize-joints').click(resizeJoints);
load();
