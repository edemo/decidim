/* global d3, DATACHARTS, fetchDatacharts */
/* eslint-disable id-length, max-params, no-undefined, no-sequences, multiline-ternary, no-ternary */
/* eslint prefer-reflect: ["error", { "exceptions": ["call"] }] */
/* eslint dot-location: ["error", "property"] */

// = require d3

const renderRowCharts = () => {
  // lib
  const rowchart = (opts = {}) => {
    // parse opts
    let data = opts.data
    let title = opts.title
    let subtitle = opts.subtitle
    let container = d3.select(opts.container)
    let ratio = opts.ratio
    let xTickFormat = opts.xTickFormat
    let showTooltip = opts.tip !== "false"
    let legendSize = 15

    // precalculation
    // Explanation: get the inner values foreach object outer values, flat the array, remove duplicates
    let maxValue = d3.max([...new Set([].concat(...data.map((f) => f.value.map((d) => d.value))))])
    // Explanation: get the inner keys foreach object outer values, flat the array, remove duplicates
    let keys = [...new Set([].concat(...data.map((f) => f.value.map((d) => d.key))))]

    const headerHeight = (keys.length * legendSize * 1.2)
    const gutter = 5

    // set the dimensions and margins of the graph
    let margin = {
      top: headerHeight + (gutter * 2),
      right: gutter * 2,
      bottom: gutter * 6,
      left: Number(container.node().getBoundingClientRect().width) * 0.25
    }

    let width = Number(container.node().getBoundingClientRect().width) - margin.left - margin.right
    let height = (width / ratio) - margin.top - margin.bottom

    // set the ranges
    const x = d3.scaleLinear().rangeRound([0, width])
    const y0 = d3.scaleBand().rangeRound([height, 0]).paddingInner(0.1)
    const y1 = d3.scaleBand().padding(0.05)

    // set the scales
    x.domain([0, maxValue]).nice()
    // group names
    y0.domain(data.map((d) => d.key))
    // individual values for each group
    y1.domain(keys).rangeRound([0, y0.bandwidth()])

    // container
    let svg = container.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)

    let upper = svg.append("g")
      .attr("transform", `translate(0,${headerHeight})`)

    // title
    upper.append("text")
      .attr("x", 0)
      .attr("y", -20)
      .attr("class", "title")
      .text(title)

    // subtitle
    upper.append("text")
      .attr("class", "subtitle")
      .text(subtitle)

    // legend
    let legend = upper.append("g")
      .attr("text-anchor", "end")
      .selectAll("g")
      .data(keys)
      .enter().append("g")
      .attr("transform", (d, i) => `translate(0,${-(i * legendSize * 1.2) - margin.top + headerHeight})`)

    legend.append("rect")
      .attr("x", width + margin.left + margin.right - legendSize)
      .attr("width", legendSize)
      .attr("height", legendSize)
      .attr("class", (d, i) => `type-${i}`)

    legend.append("text")
      .attr("x", width + margin.left + margin.right - legendSize - 4)
      .attr("y", legendSize / 2)
      .attr("dy", "0.32em")
      .attr("class", "subtitle")
      .text((d) => d)

    let lower = svg.append("g")
      .attr("transform", `translate(0,${margin.top})`)

    // background
    lower.append("rect")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + gutter - headerHeight)
      .attr("class", "background")

    // main group
    let g = lower.append("g")
      .attr("transform", `translate(${margin.left},${margin.top - headerHeight})`)

    // axis
    let xAxis = d3.axisBottom(x)
      .ticks(5)
      .tickSize(-height)
      .tickFormat(xTickFormat)
    let yAxis = d3.axisLeft(y0)

    let _xAxis = (xg) => {
      xg.call(xAxis)
      xg.select(".domain").remove()
      xg.selectAll(".tick line").attr("class", "dashed")
      xg.selectAll(".tick text").attr("y", gutter + 6)
    }
    let _yAxis = (yg) => {
      yg.call(yAxis)
      yg.select(".domain").remove()
      yg.selectAll(".tick line").remove()
      yg.selectAll(".tick text")
        .attr("class", "text-large")
    }

    g.append("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0,${height})`)
      .call(_xAxis)

    g.append("g")
      .attr("class", "y axis")
      .call(_yAxis)

    // bars
    let barGroup = g.append("g")
      .selectAll("g")
      .data(data)
      .enter().append("g")
      .attr("class", "group")
      .attr("transform", (d) => `translate(0,${y0(d.key)})`)

    barGroup.selectAll("rect")
      .data((d) => d.value)
      .enter().append("rect")
      .attr("y", (d) => y1(d.key))
      .attr("height", y1.bandwidth())
      .attr("class", (d) =>  `type-${keys.indexOf(d.key)}`)
      .transition()
      .duration(500)
      .attr("width", (d) => x(d.value))
  }

  return $(".rowchart:visible").each((i, container) => {

    // Initialize dataset values
    const init = (dataset) => {
      const datasetDefault = {
        metric: "",
        title: "",
        subtitle: "",
        ratio: "",
        percent: "",
        tip: ""
      }
      return {...datasetDefault, ...dataset}
    }

    // OPTIONAL: Helper function to turn all values into percentages
    const percentage = (percent) => {
      // helper function to groupBy
      const groupBy = (arr, by) => arr.reduce((r, v, j, a, k = v[by]) => ((r[k] || (r[k] = [])).push(v), r), {})
      // get an object grouped by key
      let groupByKey = groupBy([].concat(...percent.map((f) => f.value)), "key")
      // get total sum of values by key
      for (let cat in groupByKey) {
        if (Object.prototype.hasOwnProperty.call(groupByKey, cat)) {
          groupByKey[cat] = groupByKey[cat].map((f) => f.value).reduce((a, b) => a + b)
        }
      }
      // updates every value with its respective percentage
      [].concat(...percent.map((f) => f.value)).map((item) => {
        item.value = (item.value / groupByKey[item.key]) * 100
        return item
      })

      return percent
    }

    // MANDATORY: HTML must contain which metric should it display
    // If there's no data, fetch it
    if (!DATACHARTS || !DATACHARTS[container.dataset.metric]) {
      fetchDatacharts()
    }

    // Make a clone of the array of objects
    let data = DATACHARTS[container.dataset.metric].map((d) => {
      return { ...d }
    })

    if (data) {
      let config = init(container.dataset)
      let dataModified = data

      if (config.percent === "true") {
        dataModified = percentage(data)
        config.xTickFormat = (d) => `${d}%`
      }

      rowchart({
        container: `#${container.id}`,
        title: config.title,
        subtitle: config.subtitle,
        data: dataModified,
        xTickFormat: config.xTickFormat,
        ratio: config.ratio.split(":").reduce((a, b) => a / b) || (4 / 3),
        tip: config.tip
      })
    }
  })
}
