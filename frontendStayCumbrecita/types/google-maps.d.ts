declare global {
  interface Window {
    google: typeof google
    initGooglePlaces?: () => void
    initGooglePlaceAutocomplete?: () => void
  }
}

declare namespace google.maps {
  class Map {
    constructor(mapDiv: Element, opts?: MapOptions)
  }

  class Marker {
    constructor(opts?: MarkerOptions)
    addListener(eventName: string, handler: () => void): void
    setMap(map: Map | null): void
  }

  class InfoWindow {
    constructor(opts?: InfoWindowOptions)
    open(map?: Map, anchor?: Marker): void
  }

  class Geocoder {
    geocode(
      request: GeocoderRequest,
      callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void
    ): void
  }

  interface MapOptions {
    center?: LatLng | LatLngLiteral
    zoom?: number
    mapTypeId?: MapTypeId
    mapTypeControl?: boolean
    streetViewControl?: boolean
    fullscreenControl?: boolean
    zoomControl?: boolean
    styles?: MapTypeStyle[]
  }

  interface MarkerOptions {
    position?: LatLng | LatLngLiteral
    map?: Map
    title?: string
    animation?: Animation
    icon?: string | Icon
  }

  interface InfoWindowOptions {
    content?: string | Element
  }

  interface GeocoderRequest {
    address?: string
    region?: string
    componentRestrictions?: GeocoderComponentRestrictions
  }

  interface GeocoderComponentRestrictions {
    country?: string | string[]
  }

  interface GeocoderResult {
    geometry: GeocoderGeometry
    formatted_address: string
  }

  interface GeocoderGeometry {
    location: LatLng
  }

  interface LatLng {
    lat(): number
    lng(): number
  }

  interface LatLngLiteral {
    lat: number
    lng: number
  }

  interface Icon {
    url: string
    scaledSize?: Size
  }

  class Size {
    constructor(width: number, height: number)
  }

  interface MapTypeStyle {
    featureType?: string
    elementType?: string
    stylers?: any[]
  }

  enum Animation {
    BOUNCE = 1,
    DROP = 2
  }

  enum GeocoderStatus {
    OK = 'OK',
    ZERO_RESULTS = 'ZERO_RESULTS',
    OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
    REQUEST_DENIED = 'REQUEST_DENIED',
    INVALID_REQUEST = 'INVALID_REQUEST',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
  }

  namespace places {
    class Autocomplete {
      constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions)
      addListener(eventName: string, handler: () => void): void
      getPlace(): PlaceResult
    }

    interface AutocompleteOptions {
      componentRestrictions?: { country: string }
      fields?: string[]
      types?: string[]
    }

    interface PlaceResult {
      address_components?: any[]
      geometry?: any
      formatted_address?: string
    }

    class AutocompleteSuggestion {
      static fetchAutocompleteSuggestions(request: any): Promise<any>
    }

    class AutocompleteSessionToken {
      constructor()
    }
  }

  namespace event {
    function clearInstanceListeners(instance: any): void
  }
}

export {} 