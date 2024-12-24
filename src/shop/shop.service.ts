import {Inject, Injectable} from '@nestjs/common';
import {ConfigService} from "@nestjs/config/dist";
import {GenerativeModel} from "@google/generative-ai";
import {HttpService} from "@nestjs/axios";
import {Item} from "../items/item.service";
import {GenerateShopDto} from "./shop.controller";
import {shopSchema, ShopType} from "./shop.schema";
import {validateMonsterProperties} from "../monster/monsters.utils";
import {validateShopProperties} from "./shop.utils";
import {NoValidShopException} from "./shop.errors";

export class Shop {
  id: number;
  name: string;
  shopkeeper_description: string;
  goods: Item[];
}


@Injectable()
export class ShopService {
  private generatedShops: Shop[] = [];

  constructor(private configService: ConfigService,
              private httpsService: HttpService,
              @Inject('GENAI_MODEL') private model: GenerativeModel) {}

  async generateShop(data: GenerateShopDto) {

    let prompt =
      "generate a " + data.type + " shop of " + data.numberOfItems + " level " + data.level + " items, " +
      "add a short description for the shop keeper";

    switch (data.type) {
      case ShopType.Weapons:
        prompt += "add damage values for the items";
        break;
      case ShopType.Armor:
        prompt += "add armor values for the items";
        break;
    }

    console.log("Generating shop...");

    this.model.generationConfig.responseMimeType = "application/json";
    this.model.generationConfig.responseSchema = shopSchema;
    const result = await this.model.generateContent(prompt);
    const generatedShop : Shop = JSON.parse(result.response.text());
    console.log("shop generated and parsed, checking integrity ...");

    const errors = validateShopProperties(generatedShop)
    if(errors.length === 0){
      console.log("generated Shop seems valid");
    } else {
      console.log("Something went wrong in this shop generation, skipping and logging errors...");
      console.log(errors);
      throw new NoValidShopException(errors);
    }

    this.generatedShops.push(generatedShop);
    return generatedShop;
  }

  getGeneratedShops(): Shop[] {
    return this.generatedShops;
  }
}
