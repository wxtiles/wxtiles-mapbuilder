import React from 'react'
import ReactDOM from 'react-dom'
import generateUrl from './mapOverlay/generateUrl'
import legends from './mapOverlay/legends'
import _ from 'lodash'
import timeSlider from './mapOverlay/timeSlider'
import moment from 'moment'
import wxtiles from './wxtiles'

var findBestTimeStepsForEachLayer = ({layers, time}) => {
  // For each layer, for each of its available time-based URLs, set the
  // layer.time property to be equal to the nearest valid time to the time
  // that is seelcted on the timeslider.
  time = moment.utc(time)
  return _.map(layers, (layer) => {
    var allTimesForLayer = _.map(layer.times, (t) => moment.utc(t, 'YYYY-MM-DDTHH:mm:ss[Z]'))
    allTimesForLayer = _.sortBy(allTimesForLayer, (t) => +t)

    var timeToSelect = null
    allTimesForLayer = _.forEach(allTimesForLayer, (timeForLayer, key) => {
      if (timeToSelect) {
        return false
      } else if (time.isBefore(timeForLayer)) {
        return
      } else if (time.isSameOrAfter(allTimesForLayer[key+1])) {
        return
      } else {
        timeToSelect = timeForLayer
      }
    })
    timeToSelect = timeToSelect ? timeToSelect : _.last(allTimesForLayer)
    layer.time = timeToSelect.format('YYYY-MM-DDTHH:mm:ss[Z]')
    return layer
  })
}

var updateVisibleUrls = ({layers, onSuccess}) => {
  var scopedLayers = layers
  Promise.all(_.map(scopedLayers, (layer) => {
    return new Promise((resolve, reject) => {
      layer.visibleUrl = null
      if (!layer.time) return resolve(layer)
      wxtiles.getTileLayerUrl({
        layerId: layer.id,
        styleId: layer.styleId,
        instanceId: layer.instanceId,
        time: layer.time,
        level: 0,
        onSuccess: (url) => {
          layer.visibleUrl = url
          resolve(layer)
        }
      })
    })
  })).then(onSuccess)
}

class mapControls extends React.Component {
  constructor() {
    super()
    this.state = {}
    this.updateMapOptions = this.updateMapOptions.bind(this)
  }

  componentWillMount() {
  }

  updateMapOptions({mapOptions}) {
    this.props.updateMapOptions({mapOptions})
  }

  render() {
    var mapOptions = this.props.mapOptions
    var layers = mapOptions.layers

    var selectTime = ({time, ignore}) => {
      var ignore = ignore ? ignore : false
      mapOptions.time = time
      mapOptions.displayTime = time
      this.props.updateMapOptions({mapOptions})
      if (ignore) { return }
      var layersWithTime = findBestTimeStepsForEachLayer({layers, time})
      updateVisibleUrls({
        layers: layersWithTime,
        onSuccess: (layers) => {
          this.props.updateLayers({layers})
        }
      })
    }

    var selectStyle = ({layerId, styleId}) => {
      _.find(mapOptions.layers, (l) => { return l.id == layerId }).styleId = styleId
      this.props.updateMapOptions({mapOptions})
      // this.props.updateLayers({layers: mapOptions.layers})
      updateVisibleUrls({
        layers: mapOptions.layers,
        onSuccess: (layers) => {
          this.props.updateLayers({layers})
        }
      })
    }

    var timeSliderDatums = {
      selectTime,
      updateMapOptions: this.updateMapOptions,
      mapOptions: this.props.mapOptions
    }

    var legendsDatums = {
      layers: _.filter(layers, (layer) => layer.label),
      selectStyle
    }
    legendsDatums.layers = _.map(legendsDatums.layers, (layer) => {
      return {
        label: layer.label,
        description: layer.description,
        hasLegend: layer.hasLegend,
        layerId: layer.id,
        styles: layer.styles,
        styleId: layer.styleId,
      }
    })

    var generateUrlDatums = {
      zoom: this.props.mapOptions.zoom,
      center: this.props.mapOptions.center,
      animationFrameMinutes: this.props.mapOptions.animationFrameMinutes,
      layers: _.map(layers, (layer) => {
        return {
          id: layer.id,
          opacity: layer.opacity,
          zIndex: layer.zIndex,
          styleId: layer.styleId
        }
      })
    }

    return React.createElement('div', {className: 'mapControls'},
      React.createElement(generateUrl, {urlDatums: generateUrlDatums, apikey: this.props.mapOptions.apikey}),
      React.createElement(legends, {legends: legendsDatums}),
      React.createElement('div', {className: 'timeSliderContainer'},
        React.createElement('div', {className: 'timeSliderWrapper'},
          React.createElement(timeSlider, timeSliderDatums)
        )
      )
    )
  }
}

export default mapControls
