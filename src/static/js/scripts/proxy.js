require("bootstrap-table");
require('bootstrap-table/dist/bootstrap-table.min.css');

const libproxy = require("./lib/libproxy.js");
// Get node-fetch object with http-agent support from sag-electron preload
const getProxiedFetch = document.sagelectron.getProxiedFetch;

var proxylist = null;

function saveList(text) {
    localStorage.setItem("proxylist2", text);
}

async function check(proxy) {
    // check if proxy can connect to steam
    try {
        var res = await getProxiedFetch(proxy)("https://store.steampowered.com/join/refreshcaptcha/", { timeout: 5000 });
        return typeof (await res.json()).gid != "undefined";
    } catch (error) {
        return false;
    }
}

try {
    proxylist = libproxy.newList(localStorage.getItem("proxylist2"), saveList, check);
} catch (error) {
    proxylist = libproxy.newList(null, saveList, check);
}

var tabledata = null;

function fillTable() {
    tabledata = [];
    for (var i in proxylist.proxies) {
        var entry = proxylist.proxies[i];
        tabledata.push({ uri: entry.uri, type: entry.type == 1 ? "Direct" : "Backconnect/Rotating", status: entry.status(), selected: false });
    }
    $("#proxy_datatable").bootstrapTable();
    $("#proxy_datatable").bootstrapTable("load", tabledata);
}

exports.openEditor = function () {
    fillTable();
    $("#proxy_edit").modal('show');
}

exports.getProxy = async function () {
    var proxy = await proxylist.getProxy();
    if (!proxy)
        return;
    else return { proxy: proxy, fetch: getProxiedFetch(proxy.uri) };
}

global.proxylist_save_deletes = function () {
    for (var i in tabledata) {
        var entry = tabledata[i];
        if (entry.selected)
            proxylist.proxies = proxylist.proxies.filter(function (proxy) {
                return proxy.uri !== entry.uri;
            })
    }
    proxylist.dump();
    fillTable();
}

global.proxylist_new = function () {
    $("#proxy_new_uri").val("");
    $("#proxy_new").modal("show");
}

global.proxylist_new_on_type_change = function () {
    if ($("#proxy_new_type").val() === "Direct") {
        $("#proxy_new_rotatetime_span").hide();
    } else {
        $("#proxy_new_rotatetime_span").show();
    }
}

global.proxylist_new_save = function () {
    if ($("#proxy_new_type").val() === "Direct") {
        proxylist.importDirect($("#proxy_new_uri").val());
    } else {
        proxylist.importBackconnect($("#proxy_new_uri").val(), $("#proxy_new_rotatetime").val() * 1000);
    }
    fillTable();
}

global.proxylist_new_massdirect = function () {
    $("#proxylist_massdirect_input").val("");
    $("#proxylist_massdirect").modal("show");
}

global.proxylist_new_massdirect_save = function () {
    proxylist.importDirectNewline($("#proxylist_massdirect_input").val());
    fillTable();
}