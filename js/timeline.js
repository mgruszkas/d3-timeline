'use strict';

const X_MARGIN = 40;
const Y_MARGIN = 40;

class TimeLine {

    constructor(fineName, domNode, date, hour) {
        date || new Date();
        hour = hour || 7;
        this.svg = domNode
        this._scale = 6;
        this.Width = 200;
        this.Height = 200;
        this.createSVGContainer();
        this.prepareTimeRange(date, hour);
        d3.json(fineName, (error, data) => this.buildTimeLine(error, data));
    }

    prepareTimeRange(date, hour) {
        this._timeFrom = date;
        this._timeFrom.setHours(hour, 0, 0);
        this._timeTo = new Date(this._timeFrom.getTime() + 3600 * 24 * 1000);
    }

    set Width(width) {

        this._width = width + X_MARGIN;
        d3.select(this.svg).attr("width", this._width);

    }

    set Height(height) {

        this._height = height + Y_MARGIN;
        d3.select(this.svg).attr("height", this._height);
    }

    get Height() {
        return this._height - Y_MARGIN;
    }

    get startDate() {
        return this._timeFrom;
    }

    get endDate() {
        return this._timeTo;
    }

    set currentScale(scale) {
        this._scale = scale;
    }

    get currentScale() {
        return this._scale * this._width;
    }


    buildTimeLine(error, data) {
        this._data = data;
        this.draw();
    }



    draw() {

        let timeScale = d3.time.scale().domain([this.startDate, d3.time.day.offset(this.endDate, 1)]).rangeRound([0, this.currentScale]);
        let rowScale = d3.scale.ordinal().domain(this._data.series.map((data) => {
            return data.name;
        })).rangeRoundBands([0, this.Height]);


        let addZoom = () => {

            let zoom = d3.behavior.zoom();

            let calculateXTranslate = (width) => {
                return d3.event.translate[0] < width * -1 ? width * -1 : d3.event.translate[0] < 0 ? d3.event.translate[0] : 0;
            };

            let zoomEnd = () => {
                let dataWidth = d3.select("g.mainContainer", this.svg).node().getBBox().width;

                if (d3.event.translate[0] > X_MARGIN) {
                    zoom.translate([X_MARGIN, Y_MARGIN])
                    return;
                }

                if (d3.event.translate[0] < (dataWidth + Y_MARGIN - this._width) * -1) {
                    zoom.translate([(dataWidth + Y_MARGIN - this._width) * -1, Y_MARGIN]);
                    return;
                }

                d3.select(this.svg)
                    .select("g.mainContainer")
                    .attr("transform", `translate(${calculateXTranslate(dataWidth) },${Y_MARGIN})scale(${d3.event.scale})`);

                d3.select(this.svg)
                    .select("g#xAxis")
                    .attr("transform", `translate(${calculateXTranslate(dataWidth) },0)scale(${d3.event.scale})`);

            };

            return zoom.scaleExtent([1, 1])
                .on("zoom", zoomEnd);
        };


        d3.select(this.svg)
            .selectAll("g")
            .remove();

        let timeLine = this;
        let itemGroups = d3.select(this.svg)
            .call(addZoom())
            .append("g")
            .attr("class", "mainContainer")
            .attr("data-scale", this._scale)
            .attr("transform", `translate(${0},${Y_MARGIN})`)
            .selectAll("g.mainContainer g")
            .data(this._data.series)
            .enter()
            .append("g")
            .attr("transform", (d, i) => `translate(0,${rowScale(d.name) })`)
            .selectAll("g.item")
            .data((d, i) => d.data)
            .enter()
            .append("g")
            .attr("class", "item")
            .attr("transform", (d, i) => `translate(${timeScale(new Date(d.dateStart)) },0)`)
            .on("mouseover", function (d, i) {
                d3.select("g.mainContainer").classed("hovered", true);
                d3.select(this).classed("hovered", true);
                timeLine.toolTip = d3.select(timeLine.parentContainer).append("div")
                    .attr("class", "toolTip");

                timeLine.toolTip.append("div")
                    .attr("class", "title")
                    .text(d.name)

                timeLine.toolTip.append("div")
                    .attr("class", "hour")
                    .text(() => {
                        let dateStart = new Date(d.dateStart);
                        let dateEnd = new Date(d.dateEnd);
                        return `${dateStart.toISOString().slice(11, 16) } - ${dateEnd.toISOString().slice(11, 16) }`;
                    });

                timeLine.toolTip.append("div")
                    .attr("class", "description")
                    .text(d.description);
            })
            .on("mouseout", function () {
                //d3.select("#hoveredItem",this).remove();
                d3.select("g.mainContainer").classed("hovered", false);
                d3.select(this).classed("hovered", false);
                d3.select(".toolTip", timeLine.parentContainer).remove();
            })
            .on("mousemove", function () {
                let point = d3.mouse(timeLine.svg);
                d3.select(".toolTip", timeLine.parentContainer).style("left", `${point[0] + 20}px`).style("top", `${point[1] - 20}px`);

            });

        itemGroups.selectAll("rect")
            .data((d, i) => [d])
            .enter()
            .append("rect")
            .attr("x", (d, i) => 0)
            .attr("y", (d, i) => 0)
            .attr("width", (d, i) => timeScale(new Date(d.dateEnd)) - timeScale(new Date(d.dateStart)))
            .attr("height", (d, i) => Math.ceil(this.Height / this._data.series.length));

        itemGroups.selectAll("text")
            .data((d, i) => [d])
            .enter().append("text")
            .attr("text-anchor", "middle")
            .attr("x", "5")
            .attr("y", "0")
            .attr("dy", "1.2em")
            .text((d, i) => d.name);

        this.prepareScales();
        this.prepareAxies(timeScale, rowScale);
    }

    prepareAxies(xScale, yScale) {
        let xAxis = d3.svg.axis().scale(xScale).orient('bottom').ticks(d3.time.hour, 1).tickFormat(d3.time.format("%I"));
        d3.select(this.svg).append("g").attr("id", "xAxis").call(xAxis);

        let yAxis = d3.svg.axis().scale(yScale).orient("right");
        d3.select(this.svg).append("g").attr("id", "yAxis").call(yAxis);
    }

    prepareScales() {
        let scales = [4, 6, 12, 24];
        let fonts = [10, 12, 14, 18];
        let base = 24;

        let ranges = scales.map((i, e) => {
            return {
                value: i,
                label: `${base / i * 2}h`,
                font: fonts[e]
            };
        });

        let rescale = (d, i) => {
            this.currentScale = d.value;
            d3.select("g.mainContainer").style("font-size", `${d.font}px`);
            this.draw();
        };

        d3.select(this.svg)
            .append("g")
            .attr("class", "scaleButtons")
            .attr("transform", `translate(10,${this._height - 40})`)
            .selectAll("g g.ranges")
            .data(ranges)
            .enter()
            .append("g")
            .attr("class", "ranges")
            .attr("transform", (d, i) => `translate(${i * 50},0)`)
            .call(function () {
                this.append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", 30)
                    .attr("height", 30)
                    .attr("fill", "white")
                    .attr("stroke", "black");
            })
            .call(function () {
                this.append("text")
                    .text((d, i) => d.label)
                    .attr("y", 0)
                    .attr("x", 0)
                    .attr("dy", "1.2em")
                    .attr("dx", "15")
                    .style("text-anchor", "middle");
            })
            .on("click", (d, i) => rescale(d, i));

    }

    createSVGContainer() {
        this.parentContainer = d3.select(this.svg).node().parentNode;
        d3.select(this.parentContainer)
            .style("position: relative");
    }


}