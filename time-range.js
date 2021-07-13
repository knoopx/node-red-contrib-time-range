const { scaleTime } = require("d3-scale")
const moment = require("moment")
const suncalc = require("suncalc2")

function createTime(day, time) {
  const hour = time.get("hour")
  const minute = time.get("minute")
  const seconds = 0

  const result = day.clone().set({ hour, minute, seconds })
  return result
}

function getMomentByTime(day, time, format) {
  const parsedTime = moment(time, format)
  if (parsedTime.isValid()) {
    return createTime(day, parsedTime)
  }
  return null
}

function convertLocalTimeToTimezone(time, offset) {
  const utcTime = moment.utc(time)
  const result = utcTime.utcOffset(offset)
  return result
}

function getSunCalcTime(day, name, location) {
  const midDay = day.clone().startOf("day").add(12, "hours")
  const sunCalcTimes = suncalc.getTimes(
    midDay,
    location.latitude,
    location.longitude,
  )
  return sunCalcTimes[name]
}

function getMomentBySunCalcName(day, name, location) {
  const sunCalcTime = getSunCalcTime(day, name, location)
  if (sunCalcTime) {
    const parsedTime = convertLocalTimeToTimezone(sunCalcTime, day.utcOffset())
    return createTime(day, parsedTime)
  }
  return null
}

function timeToMoment(day, time, location) {
  const parsedTime = getMomentByTime(day, time, "HH:mm")

  if (parsedTime) {
    return parsedTime
  }

  return getMomentBySunCalcName(day, time, location)
}

function parse(date, time, location) {
  return timeToMoment(date, time, location)
}

module.exports = (RED) => {
  class TimeRangeNode {
    constructor(config) {
      RED.nodes.createNode(this, config)

      const { domain = [], range = [] } = config

      this.domain = domain.map((x) => x.value)
      this.range = range.map((x) => x.value)

      this.on("input", this.onInput)
    }

    onInput = (msg) => {
      const { location } = msg.payload

      const domain = msg.payload.domain || this.domain
      const range = msg.payload.range || this.range

      const now = moment()
      const parsedDomain = domain.map((x) => parse(now, x, location).toDate())

      const timeScale = scaleTime()
        .domain(parsedDomain)
        .rangeRound(range)
        .clamp(true)

      this.send({
        ...msg,
        payload: timeScale(now.toDate()),
        domain: parsedDomain,
      })
    }
  }

  RED.nodes.registerType("time range", TimeRangeNode)
}
