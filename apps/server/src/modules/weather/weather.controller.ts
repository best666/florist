import { Controller, Get, Query } from '@nestjs/common';
import { ReverseGeocodeQueryDto, SearchCityQueryDto, WeatherQueryDto } from './dto/weather-query.dto';
import type { CityOptionResponse, WeatherSnapshotResponse } from './weather.service';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  public constructor(private readonly weatherService: WeatherService) {}

  @Get('search')
  public searchCities(@Query() query: SearchCityQueryDto): Promise<CityOptionResponse[]> {
    return this.weatherService.searchCities(query.keyword);
  }

  @Get('reverse')
  public reverseGeocode(@Query() query: ReverseGeocodeQueryDto): Promise<CityOptionResponse | null> {
    return this.weatherService.reverseGeocode(query.latitude, query.longitude);
  }

  @Get('current')
  public fetchWeather(@Query() query: WeatherQueryDto): Promise<WeatherSnapshotResponse> {
    return this.weatherService.fetchWeather({
      id: query.id,
      name: query.name,
      country: query.country,
      ...(query.admin1 ? { admin1: query.admin1 } : {}),
      latitude: query.latitude,
      longitude: query.longitude,
      ...(query.timezone ? { timezone: query.timezone } : {}),
    });
  }
}
