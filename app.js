import express from "express";
import {getProductDetail, getProducts} from "./api/products.js";
import Redis from "ioredis";
import { getCachedData, rateLimiter } from "./middleware/redis.js";

const app = express();

export const redis = new Redis({
    password: '',
    host: '',
    port: 222
    
});

redis.on("connect",()=>{
    console.log("Redis connected");
})

app.get("/",rateLimiter({
    limit:3,timer:60,key:"home"
}),async(req, res)=>{
    res.send(`Hello World!`);
})

app.get("/products",rateLimiter({
    limit:2,timer:20,key:"products"
}), getCachedData("products"), async (req, res)=>{
    const products = await getProducts();
    console.log("set from cache")
    //await redis.set("products",JSON.stringify(products.products));  // permanant add
    await redis.setex("products",20,JSON.stringify(products.products));  // ttl
    
    res.json({products});
})

app.get("/product/:id", async(req,res)=>{
    const id = req.params.id;
    const key = `product:${id}`
    let product = await redis.get(key)
    if(product){
        console.log("Get From Cache")
        return res.json({
            product:JSON.parse(product)
        })
    }
    product = await getProductDetail(id);
    await redis.set(key, JSON.stringify(product))
    res.json({product})
})

app.get("/order/:id", async(req,res)=>{
    const productId = req.params.id;
    const key =   `product:${productId}`

    await redis.del(key);
    return res.json({message:`order placed successfully,product id:${productId} is ordered`})
})

app.listen(3000, ()=>{
    console.log("Server running on port 3000");
})