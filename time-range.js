const { scaleTime } = require("d3-scale")
const moment = require("moment")
const suncalc = require("suncalc2")

module.exports = (RED) => {
  class TimeRangeNode {
    constructor(config) {
      RED.nodes.createNode(this, config)

      const { domain = [], range = [], latitude, longitude } = config

      this.domain = domain.map((x) => x.value)
      this.range = range.map((x) => x.value)
      this.longitude = longitude
      this.latitude = latitude

      this.on("input", this.onInput)
    }

    parseTime = (date, expression, { latitude, longitude }) => {
      const momentTime = moment(expression, "HH:mm")
      if (momentTime.isValid()) {
        return momentTime
      }

      const sunCalcTimes = suncalc.getTimes(
        date.clone().hour(12).minute(0).second(0).toDate(),
        latitude,
        longitude,
      )

      const sunTime = sunCalcTimes[expression]

      if (sunTime) {
        return date
          .clone()
          .hour(sunTime.getHours())
          .minute(sunTime.getMinutes())
          .second(sunTime.getSeconds())
      }

      this.status({
        fill: "red",
        shape: "dot",
        text: `Invalid time: ${expression}`,
      })

      return null
    }

    onInput = (msg) => {
      const {
        domain = this.domain,
        range = this.range,
        latitude = this.latitude,
        longitude = this.longitude,
      } = msg.payload || {}

      const now = moment()
      const parsedDomain = domain.map((x) =>
        this.parseTime(now, x, { latitude, longitude }).toDate(),
      )

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
