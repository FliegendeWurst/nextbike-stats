#![allow(dead_code)]

use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection};
use serde_derive::Deserialize;

static API_URL: &'static str =
	"https://maps.nextbike.net/maps/nextbike-live.json?domains=fg,fg,fg&list_cities=0&bikes=0";

#[derive(Deserialize)]
struct NextbikeData {
	countries: Vec<Country>,
}

#[derive(Deserialize)]
struct Country {
	name: String,
	cities: Vec<City>,
}

#[derive(Deserialize)]
struct City {
	uid: u64,
	name: String,
	places: Vec<Place>,
}

#[derive(Deserialize)]
struct Place {
	uid: u64,
	lat: f64,
	lng: f64,
	name: String,
	bike: bool,
	spot: bool,
	bike_numbers: Vec<String>,
}

#[tokio::main]
async fn main() {
	let mut db = Connection::open("nextbike.db").unwrap();
	db.execute(
		"CREATE TABLE IF NOT EXISTS bikes(uid INTEGER PRIMARY KEY NOT NULL)",
		params![],
	)
	.unwrap();
	db.execute(
		"CREATE TABLE IF NOT EXISTS pos(
        uid INTEGER NOT NULL,
        time INTEGER NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        PRIMARY KEY(uid, time)
    )",
		params![],
	)
	.unwrap();
	let tx = db.transaction().unwrap();
	{
		let mut create_bike = tx
			.prepare(
				"INSERT INTO bikes (uid)
                VALUES (?1)
                ON CONFLICT DO NOTHING",
			)
			.unwrap();
		let mut create_pos = tx
			.prepare(
				"INSERT INTO pos (uid, time, lat, lng)
                VALUES (?1, ?2, ?3, ?4)
                ON CONFLICT DO NOTHING",
			)
			.unwrap();

		let start = SystemTime::now();
		let time = start
			.duration_since(UNIX_EPOCH)
			.expect("Time went backwards")
			.as_millis() as u64;
		let data: NextbikeData = reqwest::get(API_URL).await.unwrap().json().await.unwrap();

		let mut num_bikes = 0;

		for country in data.countries {
			for city in country.cities {
				for place in city.places {
					for name in place.bike_numbers {
						let name = name.parse::<u64>().unwrap();
						create_bike.execute(params![name]).unwrap();
						create_pos.execute(params![name, time, place.lat, place.lng]).unwrap();
						num_bikes += 1;
					}
				}
			}
		}
		println!("Data updated for {num_bikes} bikes.");
	}

	tx.commit().unwrap();
}
