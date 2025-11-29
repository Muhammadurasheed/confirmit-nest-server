import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { SearchMarketplaceDto } from '../business/dto/search-marketplace.dto';
import { TrackActionDto } from '../business/dto/track-action.dto';
import { UpdateMarketplaceProfileDto } from '../business/dto/marketplace-profile.dto';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search businesses in marketplace' })
  async searchBusinesses(@Query() query: SearchMarketplaceDto) {
    return this.marketplaceService.searchBusinesses(query);
  }

  @Get('business/:id')
  @ApiOperation({ summary: 'Get business profile for marketplace' })
  async getBusinessProfile(@Param('id') id: string) {
    return this.marketplaceService.getBusinessProfile(id);
  }

  @Post('business/:id/action')
  @ApiOperation({ summary: 'Track user action on business profile' })
  async trackAction(@Param('id') id: string, @Body() body: TrackActionDto) {
    return this.marketplaceService.trackAction(id, body.type);
  }

  @Patch('business/:id/profile')
  @ApiOperation({ summary: 'Update marketplace profile' })
  async updateProfile(
    @Param('id') id: string,
    @Body() body: UpdateMarketplaceProfileDto,
  ) {
    return this.marketplaceService.updateProfile(id, body);
  }

  @Post('business/:id/activate')
  @ApiOperation({ summary: 'Activate marketplace listing (1-month free)' })
  async activateMarketplace(@Param('id') id: string) {
    return this.marketplaceService.activateMarketplace(id);
  }

  @Post('business/:id/renew')
  @ApiOperation({ summary: 'Renew marketplace subscription (direct)' })
  async renewSubscription(@Param('id') id: string) {
    return this.marketplaceService.renewSubscription(id);
  }

  @Post('business/:id/renew/initialize')
  @ApiOperation({ summary: 'Initialize Paystack payment for marketplace renewal' })
  async initializeRenewal(
    @Param('id') id: string,
    @Body() body: { email: string },
  ) {
    return this.marketplaceService.initializeRenewalPayment(id, body.email);
  }

  @Post('business/:id/renew/verify')
  @ApiOperation({ summary: 'Verify marketplace renewal payment' })
  async verifyRenewal(
    @Param('id') id: string,
    @Body() body: { reference: string },
  ) {
    return this.marketplaceService.verifyRenewalPayment(id, body.reference);
  }
}
