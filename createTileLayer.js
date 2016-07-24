import React from 'react'
import ReactDOM from 'react-dom'
import wxTiles from './wxtiles'
import select from 'react-select'
import _ from 'lodash'
import layerLabel from './layerLabel'

class createTileLayer extends React.Component {
  constructor() {
    super()
    this.state = {}
    this.state.selectedLayer = null
    this.onDelete = this.onDelete.bind(this)
  }

  loadLayersList() {
    this.setState({loadedLayers: null})
    var onSuccess = (layers) => {
      layers = _.map(layers, (layer) => {
        layer.value = layer.id
        layer.label = layer.meta.name
        return layer
      })
      this.setState({loadedLayers: layers})
    }
    var onError = (err) => console.log(err)
    wxTiles.getAllLayers(onSuccess, onError)
  }

  selectLayer(layer) {
    var instances = _.map(layer.instances, (instance) => {
      instance.value = instance.id
      instance.label = instance.id
      return instance
    })
    this.setState({selectedLayer: layer, instances: instances}, () => this.selectInstance(instances[0]))
  }

  selectInstance(instance) {
    var options = {
      layerId: this.state.selectedLayer.id,
      instanceId: instance.id,
      onSuccess: (times) => {
        times = _.map(times, (time) => {
          return {value: time, label: time}
        })
        this.setState({times}, () => this.selectTime(times[0]))
      },
      onError: (error) => console.log(error),
    }
    wxTiles.getTimesForInstance(options)
    this.setState({selectedInstance: instance})
  }

  selectTime(time) {
    this.setState({selectedTime: time}, () =>{
      var getTileLayerUrlOptions = {
        layerId: this.state.selectedLayer.id,
        instanceId: this.state.selectedInstance.id,
        time: this.state.selectedTime.value,
        level: 0,
        onSuccess: (url) => {
          this.setState({url})
          this.props.putLayer({layerKey: this.props.layerKey, url: url})
        },
        onError: (err) => console.log(err),
      }
      wxTiles.getTileLayerUrl(getTileLayerUrlOptions)
    })
  }

  onDelete() {
    this.props.removeLayer({layerKey: this.props.layerKey})
  }

  componentWillMount() {
    this.loadLayersList()
  }

  render() {
    return React.createElement('li', {className: 'createTileLayer'},
      React.createElement('div', {className: 'select-container'},
        React.createElement('div', {className: 'select-list'},
          (this.state.loadedLayers == null) && React.createElement('div', null, 'Downloading layers...'),
          React.createElement(layerLabel),
          this.state.loadedLayers && React.createElement(select, {
            options: this.state.loadedLayers,
            placeholder: 'Select a layer...',
            value: this.state.selectedLayer,
            onChange: (thing) => this.selectLayer(thing)
          }),
          this.state.selectedLayer && React.createElement(select, {
            options: this.state.selectedLayer.instances,
            placeholder: 'Select an instance',
            value: this.state.selectedInstance,
            onChange: (thing) => this.selectInstance(thing)
          }),
          this.state.selectedInstance && React.createElement(select, {
            options: this.state.selectedLayer.times,
            placeholder: 'Select a time',
            value: this.state.selectedTime,
            onChange: (thang) => this.selectTime(thang)
          })
        )
      )
    )
  }
}

export default createTileLayer
