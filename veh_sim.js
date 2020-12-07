const csv = require('csv-parser')
const logUpdate = require('log-update');
const fs = require('fs');

function loadRoute(cb) {
    const parsedData = []

    fs.createReadStream('route_example.csv')
        .pipe(csv())
        .on('data', (data) => parsedData.push(data))
        .on('end', () => {
            cb(parsedData)
        })
}

function extractWaypoints(parsedData) {
    let wp = []
    parsedData.forEach(elem => {

        /*
        What is causing this bug?

        console.log(elem) 
        {
            'type': 'T', // after copying this line into VS Code I got '﻿type': 'T',
            latitude: '59.157810000',
            longitude: '17.659630000',
            'speedlimit (km/h)': '30',
            'altitude (m)': '14.5',
            course: '178.3',
            'slope (%)': '0.2',
            'distance (km)': '2.398',
            'distance_interval (m)': '96.96',
            name: '',
            desc: ''
        } */

        // console.log(Object.keys(elem)[3]) //speedlimit (km/h)
        // console.log(Object.keys(elem)[3] === 'speedlimit (km/h)') //true
        // console.log(elem[Object.keys(elem)[3]]) // 30
        // console.log(elem["speedlimit (km/h)"]) // 30

        // console.log(Object.keys(elem)[0]) // type
        // console.log(Object.keys(elem)[0] === 'type') //false
        // console.log(elem["type"]) //undefined
        // console.log(elem[Object.keys(elem)[0]]) //T
        if ('T' === elem[Object.keys(elem)[0]] && (parseFloat(elem["distance_interval (m)"]) > 0)) wp.push(elem)
    })

    return wp
}

function VehicleSimulator(waypoints) {
    this.running = true
    this.speed = 0
    this.acc = 0
    this.distance = 0
    this.speedLimit = 0
    this.slope = 0
    this.route = waypoints.reverse()
    this.subroute = waypoints[waypoints.length - 1]

    this.updateDistance = function () {
        this.distance += this.speed
    }

    this.calculateAcceleration = function () {
        if (this.slope !== undefined) this.acc = Math.sin(this.slope * (0.45))
        if (this.speed < this.speedLimit - 1) this.acc += 1.5
        if (this.speed > this.speedLimit) this.acc -= 2.5
    }

    this.calculateSpeed = function () {
        this.speed += this.acc
    }

    this.calculatePosition = function () {

        if (this.route.length <= 2 &&
            (this.distance / 1000.0 > this.route[this.route.length - 2]["distance (km)"])) {

            this.exitSimulation()
            return
        }

        while (this.distance / 1000.0 > this.route[this.route.length - 2]["distance (km)"]) {
            if (this.route.length <= 2) break
            this.route.pop()
        }

        this.subroute = this.route[this.route.length - 1]
    }

    this.setSpeedLimit = function () {
        this.speedLimit = this.subroute["speedlimit (km/h)"] / 3.6
    }

    this.setSlope = function () {
        this.slope = this.subroute["slope (%)"]
    }

    this.updateState = function () {
        this.updateDistance()
        this.calculatePosition()
        this.setSlope()
        this.setSpeedLimit()
        this.calculateSpeed()
        this.calculateAcceleration()
    }

    this.exitSimulation = function () {
        clearInterval(interval)
        this.running = false;
    }

    let interval = setInterval(() => {
        this.updateState()
    }, 1000)
}

function initiateSimulation(waypoints) {
    let vhs = new VehicleSimulator(waypoints)
    let viewRenderer = setInterval(() => updateView(viewRenderer, vhs), 1000);
}

function updateView(vr,vhs) {

  if(vhs.running) {
      logUpdate(
        ` 
Vehicle Simulator

Speed: ${(vhs.speed * 3.6).toFixed(2)} km/h 
Acceleration: ${(vhs.acc).toFixed(2)} m/s^2
Distance: ${(vhs.distance / 1000.0).toFixed(2)} km
Speedlimit: ${(vhs.speedLimit * 3.6).toFixed(2)} km/h
Slope: ${vhs.slope ? vhs.slope : 0} %
`
    )
} else {
    console.log("Simulation finished")
    clearInterval(vr)
}

}

loadRoute((parsedData) => {
    initiateSimulation(
        extractWaypoints(parsedData))
})